"""Staff-initiated WhatsApp follow-ups.

Search past delivered quotations/invoices for one matching a free-text staff
description, draft a short re-engagement message grounded in that document,
and (only on explicit confirmation via send_followup) actually send it.

Deliberately separate from app.agents.runner/graph: that pipeline turns one
*customer* message into one *customer* reply and logs it as such. This module
is operator-initiated and has no multi-step retry/approval loop, so it's a
plain service, not a LangGraph node.
"""

import uuid

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.prompts import FOLLOWUP_DRAFT_PROMPT
from app.core.config import settings
from app.models.orm import Invoice, Quotation
from app.models.schemas import FollowUpCandidate
from app.repositories.conversations import ConversationMessageRepository
from app.repositories.customers import CustomerRepository
from app.repositories.invoices import InvoiceRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.quotations import QuotationRepository
from app.services.whatsapp import send_whatsapp_message

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model=settings.openai_chat_model, api_key=settings.openai_api_key, temperature=0.3)
    return _llm


def _summarize_items(document: Quotation | Invoice) -> str:
    parts = [f"{item.get('quantity', 1)}x {item.get('product_name', 'item')}" for item in document.items]
    return ", ".join(parts) if parts else "no line items"


async def _draft_message(document: Quotation | Invoice) -> str:
    prompt = (
        f"Original customer-facing message: {document.customer_message}\n"
        f"Line items: {_summarize_items(document)}\n"
        f"Total: {document.currency} {document.total:,.2f}\n"
    )
    response = await _get_llm().ainvoke([SystemMessage(content=FOLLOWUP_DRAFT_PROMPT), HumanMessage(content=prompt)])
    return response.content


async def search_past_interactions(session: AsyncSession, description: str, limit: int = 3) -> list[FollowUpCandidate]:
    quotations = await QuotationRepository(session).search_delivered(description, limit=limit)
    invoices = await InvoiceRepository(session).search_delivered(description, limit=limit)

    documents: list[tuple[str, Quotation | Invoice]] = [("quotation", q) for q in quotations] + [
        ("invoice", i) for i in invoices
    ]
    documents.sort(key=lambda pair: pair[1].created_at, reverse=True)
    documents = documents[:limit]

    customers = CustomerRepository(session)
    candidates: list[FollowUpCandidate] = []
    for document_type, document in documents:
        customer = await customers.get(document.customer_id)
        if not customer:
            continue
        candidates.append(
            FollowUpCandidate(
                document_type=document_type,
                document_id=document.id,
                conversation_id=document.conversation_id,
                customer_id=document.customer_id,
                customer_name=customer.name,
                customer_phone=customer.phone_number,
                summary=f"{_summarize_items(document)} · {document.currency} {document.total:,.2f}",
                total=float(document.total),
                currency=document.currency,
                draft_message=await _draft_message(document),
            )
        )
    return candidates


async def send_followup(
    session: AsyncSession,
    *,
    document_type: str,
    document_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
    customer_id: uuid.UUID,
    message: str,
) -> bool:
    """Sends `message` to the customer over WhatsApp. Never raises — failures are
    recorded as a delivery_failed notification, mirroring
    app.services.approval_workflow.decide_approval's send path."""
    customer = await CustomerRepository(session).get(customer_id)
    if not customer:
        return False

    try:
        send_whatsapp_message(customer.phone_number, message)
    except Exception as exc:
        await NotificationRepository(session).create(
            type="delivery_failed",
            title="Failed to deliver follow-up message",
            body=str(exc),
            link_type=document_type,
            link_id=document_id,
        )
        return False

    if conversation_id:
        await ConversationMessageRepository(session).create(
            conversation_id=conversation_id,
            direction="outbound",
            body=message,
            agent="followup",
        )
    await NotificationRepository(session).create(
        type="followup_sent",
        title="Follow-up sent",
        body=message,
        link_type=document_type,
        link_id=document_id,
    )
    return True
