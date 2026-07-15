"""Structured (LLM-facing) output schemas for the Phase 2 agent pipeline.

Separate from app.models.schemas (API/DB layer) — these shapes are what the
LLM is asked to return via OpenAI structured outputs, then translated into
DB writes by the nodes themselves.
"""

from typing import Literal

from pydantic import BaseModel, Field

Intent = Literal["quote_request", "invoice_request", "general_query", "unknown"]
DocumentKind = Literal["quotation", "invoice"]


class IntakeResult(BaseModel):
    intent: Intent
    requested_items: list[str] = Field(default_factory=list, description="Raw product/service mentions from the customer message")
    service_requested: str | None = Field(default=None, description="Generic service line item if the customer asked for one (e.g. assembly, delivery, setup) — not installation-specific")
    summary: str = Field(description="One-sentence summary of what the customer wants")


class LineItemAssumption(BaseModel):
    field: str = Field(description="Which line item field was assumed, e.g. 'variant', 'quantity'")
    assumed_value: str
    reason: str


class LineItem(BaseModel):
    sku: str | None = None
    product_name: str
    quantity: int = 1
    unit_price: float
    line_total: float
    is_service: bool = False
    assumptions: list[LineItemAssumption] = Field(default_factory=list)


class MatchedProduct(BaseModel):
    sku: str
    name: str
    price: float
    stock_quantity: int


class ContextBundle(BaseModel):
    matched_products: list[MatchedProduct] = Field(default_factory=list, description="Product catalog matches")
    policy_snippets: list[str] = Field(default_factory=list, description="Relevant policy document chunks for the Generate/Review agents")
    notes: str = Field(default="", description="Anything the Context agent wants downstream agents to know")


class GeneratedDocument(BaseModel):
    document_type: DocumentKind
    line_items: list[LineItem]
    subtotal: float
    tax_amount: float
    total: float
    currency: str = "INR"
    customer_reply: str = Field(description="Customer-facing message to send back, referencing the quote/invoice")


class ReviewResult(BaseModel):
    approved: bool
    issues: list[str] = Field(default_factory=list, description="Problems found: pricing, quantity, tone, facts, completeness")


class ApprovalDecision(BaseModel):
    auto_approved: bool
    requires_human: bool
    reason: str
