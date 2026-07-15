"""Approve/reject/edit a pending Approval and notify the customer over WhatsApp:
approve/edit deliver the (possibly-edited) priced document; reject sends a
generic decline notice instead — never the internal `reason` (that's an
audit-trail field, not customer-facing copy) and never the document's own
customer_message (rejected documents were never approved for delivery).

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


REJECTION_MESSAGE = (
    "Thanks for your patience — after review, we're not able to move forward with "
    "this request right now. Feel free to reach out if you'd like to discuss alternatives."
)


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
        message_to_send = REJECTION_MESSAGE
    elif action == "edit":
        items = edited_items if edited_items is not None else document.items
        subtotal, tax_amount, total = calculate_totals(
            [{"unit_price": float(item["unit_price"]), "quantity": int(item["quantity"])} for item in items]
        )
        message_to_send = edited_customer_message or document.customer_message
        await repo.update(
            document,
            items=items,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total=total,
            customer_message=message_to_send,
            status="approved",
        )
        await approvals.update(
            approval, status="edited", reason=reason, approved_by=decided_by, edited_items=items, decided_at=now
        )
    else:  # approve
        message_to_send = document.customer_message
        await repo.update(document, status="approved")
        await approvals.update(approval, status="approved", reason=reason, approved_by=decided_by, decided_at=now)

    document = await repo.get(approval.document_id)  # refreshed with the update above
    delivered = False
    customer = await CustomerRepository(session).get(document.customer_id)
    if customer and message_to_send:
        try:
            send_whatsapp_message(customer.phone_number, message_to_send)
            delivered = True
            if action != "reject":  # a rejected document was never approved for delivery — stays "rejected"
                await repo.update(document, status="sent")
            if document.conversation_id:
                await ConversationMessageRepository(session).create(
                    conversation_id=document.conversation_id,
                    direction="outbound",
                    body=message_to_send,
                    agent="approval",
                )
        except Exception as exc:
            failure_context = "rejection notice" if action == "reject" else approval.document_type
            await NotificationRepository(session).create(
                type="delivery_failed",
                title=f"Failed to deliver {failure_context}",
                body=str(exc),
                link_type=approval.document_type,
                link_id=document.id,
            )

    return approval, document, delivered
