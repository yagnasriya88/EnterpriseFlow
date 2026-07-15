import uuid

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.prompts import CONTEXT_PROMPT, GENERATE_PROMPT, INTAKE_PROMPT, REVIEW_PROMPT
from app.agents.schemas import ApprovalDecision, ContextBundle, GeneratedDocument, IntakeResult, ReviewResult
from app.agents.state import AgentState
from app.agents.tools import calculate_totals, create_invoice, create_quotation, policy_semantic_search, product_lookup
from app.core.config import settings
from app.repositories.approvals import ApprovalRepository
from app.repositories.invoices import InvoiceRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.quotations import QuotationRepository
from app.services.email_notifications import send_email_notification

MAX_REVIEW_ATTEMPTS = 2

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model=settings.openai_chat_model, api_key=settings.openai_api_key, temperature=0)
    return _llm


async def intake_node(state: AgentState) -> dict:
    structured = _get_llm().with_structured_output(IntakeResult)
    result: IntakeResult = await structured.ainvoke(
        [SystemMessage(content=INTAKE_PROMPT), HumanMessage(content=state["customer_message"])]
    )
    return {"intake": result}


async def context_node(session: AsyncSession, state: AgentState) -> dict:
    intake = state["intake"]
    search_terms = list(intake.requested_items)
    if intake.service_requested:
        search_terms.append(intake.service_requested)

    matched_by_id: dict[uuid.UUID, dict] = {}
    for term in search_terms:
        for product in await product_lookup(session, term):
            matched_by_id[product.id] = {
                "sku": product.sku,
                "name": product.name,
                "price": float(product.price),
                "stock_quantity": product.stock_quantity,
            }

    policy_snippets = await policy_semantic_search(session, intake.summary)

    structured = _get_llm().with_structured_output(ContextBundle)
    prompt = (
        f"Customer wants: {intake.summary}\n"
        f"Requested items: {intake.requested_items}\n"
        f"Service requested: {intake.service_requested}\n"
        f"Candidate catalog matches: {list(matched_by_id.values())}\n"
        f"Policy snippets: {policy_snippets}\n"
        "Filter to genuinely relevant matches and summarize what Generate needs to know."
    )
    context: ContextBundle = await structured.ainvoke([SystemMessage(content=CONTEXT_PROMPT), HumanMessage(content=prompt)])
    return {"context": context}


async def generate_node(session: AsyncSession, state: AgentState) -> dict:
    intake = state["intake"]
    context = state["context"]
    document_kind = "invoice" if intake.intent == "invoice_request" else "quotation"

    structured = _get_llm().with_structured_output(GeneratedDocument)
    prompt = (
        f"Document type to produce: {document_kind}\n"
        f"Customer summary: {intake.summary}\n"
        f"Matched products: {context.matched_products}\n"
        f"Context notes: {context.notes}\n"
        f"Policy snippets: {context.policy_snippets}\n"
    )
    document: GeneratedDocument = await structured.ainvoke([SystemMessage(content=GENERATE_PROMPT), HumanMessage(content=prompt)])

    # Recompute totals ourselves rather than trusting LLM arithmetic.
    items_for_totals = [{"unit_price": li.unit_price, "quantity": li.quantity} for li in document.line_items]
    subtotal, tax_amount, total = calculate_totals(items_for_totals)
    document.subtotal, document.tax_amount, document.total = subtotal, tax_amount, total

    items_json = [li.model_dump() for li in document.line_items]
    if document.document_type == "invoice":
        record = await create_invoice(
            session,
            customer_id=state["customer_id"],
            conversation_id=state.get("conversation_id"),
            quotation_id=None,
            items=items_json,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total=total,
            currency=document.currency,
            customer_message=document.customer_reply,
        )
    else:
        record = await create_quotation(
            session,
            customer_id=state["customer_id"],
            conversation_id=state.get("conversation_id"),
            items=items_json,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total=total,
            currency=document.currency,
            customer_message=document.customer_reply,
        )

    return {"document": document, "document_id": record.id}


async def review_node(state: AgentState) -> dict:
    document = state["document"]
    structured = _get_llm().with_structured_output(ReviewResult)
    prompt = (
        f"Generated document: {document.model_dump()}\n"
        f"Context notes: {state['context'].notes}\n"
    )
    review: ReviewResult = await structured.ainvoke([SystemMessage(content=REVIEW_PROMPT), HumanMessage(content=prompt)])
    attempts = state.get("review_attempts", 0) + 1
    return {"review": review, "review_attempts": attempts}


async def approval_node(session: AsyncSession, state: AgentState) -> dict:
    """Auto-approves under-threshold documents (full priced reply goes out
    immediately); above threshold, gates delivery — the customer only gets a
    generic "under review" message here, never the priced document. The real
    quote/invoice text (document.customer_reply, persisted as
    Quotation/Invoice.customer_message) is only sent once a human approves it
    via POST /approvals/{id}/decide (see app.services.approval_workflow).
    """
    document = state["document"]
    auto_approved = document.total <= settings.auto_approve_threshold
    repo = InvoiceRepository(session) if document.document_type == "invoice" else QuotationRepository(session)
    record = await repo.get(state["document_id"])

    if auto_approved:
        await repo.update(record, status="approved")
        reply = document.customer_reply
    else:
        await repo.update(record, status="pending_approval")
        await ApprovalRepository(session).create(
            document_type=document.document_type,
            document_id=state["document_id"],
            status="pending",
        )
        await NotificationRepository(session).create(
            type="approval_needed",
            title=f"{document.document_type.title()} awaiting approval",
            body=f"Total {document.currency} {document.total:,.2f} is above the auto-approval threshold.",
            link_type=document.document_type,
            link_id=state["document_id"],
        )
        try:
            send_email_notification(
                subject=f"EnterpriseFlow: {document.document_type} awaiting approval",
                body=f"A {document.document_type} totalling {document.currency} {document.total:,.2f} needs review in the Approvals queue.",
            )
        except Exception:
            pass  # internal alert only — never let email failure break the pipeline
        reply = (
            "Thanks for the details! Your request is above our auto-approval threshold, "
            "so a team member is reviewing it now — we'll follow up shortly with confirmation."
        )

    decision = ApprovalDecision(
        auto_approved=auto_approved,
        requires_human=not auto_approved,
        reason=f"Total {document.total} {'<=' if auto_approved else '>'} threshold {settings.auto_approve_threshold}",
    )
    return {"approval": decision, "final_reply": reply}


async def direct_reply_node(state: AgentState) -> dict:
    """Handles general_query/unknown intents that don't need a quote/invoice document."""
    context = state.get("context")
    prompt = (
        f"Customer message: {state['customer_message']}\n"
        f"Policy snippets available: {context.policy_snippets if context else []}\n"
        "Reply directly and helpfully. If no relevant policy snippet is available, say you'll "
        "have a team member follow up rather than guessing."
    )
    response = await _get_llm().ainvoke(
        [SystemMessage(content="You are EnterpriseFlow's customer-facing assistant. Be concise and honest."), HumanMessage(content=prompt)]
    )
    return {"final_reply": response.content}
