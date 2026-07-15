"""Function-calling tools used by the agent nodes.

These are plain async functions bound to a request-scoped AsyncSession
rather than LLM-invoked function-calling tools: product lookup, pricing,
and persistence are deterministic operations more reliable done in code,
so nodes call them directly. The LLM is reserved for classification
(Intake), relevance judgment and customer-facing copy (Generate), and
review judgment (Review) — see app/agents/nodes.py.
"""

import uuid

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.orm import Invoice, Product, Quotation
from app.repositories.invoices import InvoiceRepository
from app.repositories.policy_documents import PolicyDocumentChunkRepository
from app.repositories.products import ProductRepository
from app.repositories.quotations import QuotationRepository

TAX_RATE = 0.18  # hardcoded 18% GST, matches the Phase 4 PLAN.md decision

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


async def product_lookup(session: AsyncSession, query: str, limit: int = 5) -> list[Product]:
    return await ProductRepository(session).search(query, limit=limit)


def calculate_totals(line_items: list[dict]) -> tuple[float, float, float]:
    subtotal = round(sum(item["unit_price"] * item["quantity"] for item in line_items), 2)
    tax_amount = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax_amount, 2)
    return subtotal, tax_amount, total


async def embed_text(text: str) -> list[float]:
    response = await _get_client().embeddings.create(model=settings.openai_embedding_model, input=text)
    return response.data[0].embedding


async def policy_semantic_search(session: AsyncSession, query: str, limit: int = 3) -> list[str]:
    embedding = await embed_text(query)
    chunks = await PolicyDocumentChunkRepository(session).search_similar(embedding, limit=limit)
    return [chunk.content for chunk in chunks]


async def create_quotation(
    session: AsyncSession,
    *,
    customer_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
    items: list[dict],
    subtotal: float,
    tax_amount: float,
    total: float,
    currency: str = "INR",
    customer_message: str | None = None,
) -> Quotation:
    return await QuotationRepository(session).create(
        customer_id=customer_id,
        conversation_id=conversation_id,
        items=items,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        currency=currency,
        customer_message=customer_message,
        status="draft",
    )


async def create_invoice(
    session: AsyncSession,
    *,
    customer_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
    quotation_id: uuid.UUID | None,
    items: list[dict],
    subtotal: float,
    tax_amount: float,
    total: float,
    currency: str = "INR",
    customer_message: str | None = None,
) -> Invoice:
    return await InvoiceRepository(session).create(
        customer_id=customer_id,
        conversation_id=conversation_id,
        quotation_id=quotation_id,
        items=items,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        currency=currency,
        customer_message=customer_message,
        status="draft",
    )
