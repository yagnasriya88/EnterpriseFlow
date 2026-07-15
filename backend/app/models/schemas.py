import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

ConversationStatus = Literal["active", "closed"]
DocumentStatus = Literal["draft", "pending_approval", "approved", "rejected", "sent"]
ApprovalStatus = Literal["pending", "approved", "rejected", "edited"]
ApprovalAction = Literal["approve", "reject", "edit"]
DocumentType = Literal["quotation", "invoice"]
MessageDirection = Literal["inbound", "outbound"]
NotificationType = Literal["approval_needed", "delivery_failed", "customer_replied"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- products ---------------------------------------------------------------

class ProductBase(BaseModel):
    sku: str
    name: str
    description: str | None = None
    price: float
    cost: float | None = None
    category: str | None = None
    stock_quantity: int = 0
    weight_grams: int | None = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    description: str | None = None
    price: float | None = None
    cost: float | None = None
    category: str | None = None
    stock_quantity: int | None = None
    weight_grams: int | None = None
    is_active: bool | None = None


class ProductRead(ProductBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- customers ----------------------------------------------------------------

class CustomerBase(BaseModel):
    name: str | None = None
    phone_number: str
    email: str | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    phone_number: str | None = None
    email: str | None = None


class CustomerRead(CustomerBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# --- conversations + messages ---------------------------------------------------

class ConversationBase(BaseModel):
    customer_id: uuid.UUID
    channel: str = "whatsapp"
    status: ConversationStatus = "active"
    last_message_at: datetime | None = None


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    status: ConversationStatus | None = None
    last_message_at: datetime | None = None


class ConversationRead(ConversationBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ConversationMessageBase(BaseModel):
    conversation_id: uuid.UUID
    direction: MessageDirection
    body: str
    agent: str | None = None


class ConversationMessageCreate(ConversationMessageBase):
    pass


class ConversationMessageRead(ConversationMessageBase, ORMModel):
    id: uuid.UUID
    created_at: datetime


# --- quotations / invoices (shared shape) ---------------------------------------

class DocumentBase(BaseModel):
    customer_id: uuid.UUID
    conversation_id: uuid.UUID | None = None
    status: DocumentStatus = "draft"
    items: list[dict[str, Any]] = []
    subtotal: float = 0
    tax_amount: float = 0
    total: float = 0
    currency: str = "INR"
    pdf_url: str | None = None
    customer_message: str | None = None


class QuotationCreate(DocumentBase):
    pass


class QuotationUpdate(BaseModel):
    status: DocumentStatus | None = None
    items: list[dict[str, Any]] | None = None
    subtotal: float | None = None
    tax_amount: float | None = None
    total: float | None = None
    pdf_url: str | None = None
    customer_message: str | None = None


class QuotationRead(DocumentBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class InvoiceCreate(DocumentBase):
    quotation_id: uuid.UUID | None = None


class InvoiceUpdate(BaseModel):
    status: DocumentStatus | None = None
    items: list[dict[str, Any]] | None = None
    subtotal: float | None = None
    tax_amount: float | None = None
    total: float | None = None
    pdf_url: str | None = None
    customer_message: str | None = None


class InvoiceRead(DocumentBase, ORMModel):
    id: uuid.UUID
    quotation_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


# --- approvals ------------------------------------------------------------------

class ApprovalBase(BaseModel):
    document_type: DocumentType
    document_id: uuid.UUID
    status: ApprovalStatus = "pending"
    reason: str | None = None
    approved_by: str | None = None
    edited_items: list[dict[str, Any]] | None = None
    decided_at: datetime | None = None


class ApprovalCreate(ApprovalBase):
    pass


class ApprovalUpdate(BaseModel):
    status: ApprovalStatus | None = None
    reason: str | None = None
    approved_by: str | None = None
    edited_items: list[dict[str, Any]] | None = None
    decided_at: datetime | None = None


class ApprovalRead(ApprovalBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ApprovalDecideRequest(BaseModel):
    action: ApprovalAction
    decided_by: str
    reason: str | None = None
    edited_items: list[dict[str, Any]] | None = None
    edited_customer_message: str | None = None


# --- policy documents -------------------------------------------------------------

class PolicyDocumentBase(BaseModel):
    title: str
    source_filename: str | None = None


class PolicyDocumentCreate(PolicyDocumentBase):
    pass


class PolicyDocumentRead(PolicyDocumentBase, ORMModel):
    id: uuid.UUID
    created_at: datetime


class PolicyDocumentChunkRead(ORMModel):
    id: uuid.UUID
    policy_document_id: uuid.UUID
    chunk_index: int
    content: str
    created_at: datetime


# --- notifications ----------------------------------------------------------------

class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    body: str | None = None
    link_type: str | None = None
    link_id: uuid.UUID | None = None
    is_read: bool = False


class NotificationCreate(NotificationBase):
    pass


class NotificationRead(NotificationBase, ORMModel):
    id: uuid.UUID
    created_at: datetime
