"""Approve/reject/edit a pending Approval and, on approve/edit, deliver the
(possibly-edited) document to the customer over WhatsApp.

This is the other half of the Phase 5 delivery gate: app.agents.nodes.approval_node
withholds the priced customer_message while status is pending_approval; this
module is what actually sends it once a human decides.
"""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.tools import calculate_totals
from app.models.orm import Approval
from app.repositories.approvals import ApprovalRepository
from app.repositories.conversations import ConversationMessageRepository
from app.repositories.customers import CustomerRepository
from app.repositories.invoices import InvoiceRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.quotations import QuotationRepository
from app.services.whatsapp import send_whatsapp_message


class ApprovalAlreadyDecidedError(Exception):
    pass


async def decide_approval(
    session: AsyncSession,
    approval: Approval,
    *,
    action: str,
    decided_by: str,
    reason: str | None = None,
    edited_items: list[dict[str, Any]] | None = None,
    edited_customer_message: str | None = None,
) -> tuple[Approval, Any, bool]:
    if approval.status != "pending":
        raise ApprovalAlreadyDecidedError(f"Approval {approval.id} was already decided ({approval.status})")

    repo = InvoiceRepository(session) if approval.document_type == "invoice" else QuotationRepository(session)
    document = await repo.get(approval.document_id)
    if document is None:
        raise ValueError(f"{approval.document_type} {approval.document_id} not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)  # columns are TIMESTAMP WITHOUT TIME ZONE, like the rest of the schema
    approvals = ApprovalRepository(session)

    if action == "reject":
        await repo.update(document, status="rejected")
        await approvals.update(approval, status="rejected", reason=reason, approved_by=decided_by, decided_at=now)
        return approval, document, False

    if action == "edit":
        items = edited_items if edited_items is not None else document.items
        subtotal, tax_amount, total = calculate_totals(
            [{"unit_price": float(item["unit_price"]), "quantity": int(item["quantity"])} for item in items]
        )
        message = edited_customer_message or document.customer_message
        await repo.update(
            document,
            items=items,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total=total,
            customer_message=message,
            status="approved",
        )
        await approvals.update(
            approval, status="edited", reason=reason, approved_by=decided_by, edited_items=items, decided_at=now
        )
    else:  # approve
        await repo.update(document, status="approved")
        await approvals.update(approval, status="approved", reason=reason, approved_by=decided_by, decided_at=now)

    document = await repo.get(approval.document_id)  # refreshed with the update above
    delivered = False
    customer = await CustomerRepository(session).get(document.customer_id)
    if customer and document.customer_message:
        try:
            send_whatsapp_message(customer.phone_number, document.customer_message)
            delivered = True
            await repo.update(document, status="sent")
            if document.conversation_id:
                await ConversationMessageRepository(session).create(
                    conversation_id=document.conversation_id,
                    direction="outbound",
                    body=document.customer_message,
                    agent="approval",
                )
        except Exception as exc:
            await NotificationRepository(session).create(
                type="delivery_failed",
                title=f"Failed to deliver {approval.document_type}",
                body=str(exc),
                link_type=approval.document_type,
                link_id=document.id,
            )

    return approval, document, delivered
