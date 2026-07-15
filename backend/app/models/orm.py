import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _created_at() -> Mapped[datetime]:
    return mapped_column(server_default=func.now())


def _updated_at() -> Mapped[datetime]:
    return mapped_column(server_default=func.now(), onupdate=func.now())


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cost: Mapped[float | None] = mapped_column(Numeric(10, 2))
    category: Mapped[str | None] = mapped_column(String)
    stock_quantity: Mapped[int] = mapped_column(default=0)
    weight_grams: Mapped[int | None]
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str | None] = mapped_column(String)
    phone_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(default="whatsapp")
    status: Mapped[str] = mapped_column(default="active")
    last_message_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()

    messages: Mapped[list["ConversationMessage"]] = relationship(back_populates="conversation")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    direction: Mapped[str] = mapped_column(nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    agent: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = _created_at()

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(default="draft")
    items: Mapped[list] = mapped_column(JSONB, default=list)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    currency: Mapped[str] = mapped_column(default="INR")
    pdf_url: Mapped[str | None] = mapped_column(String)
    customer_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("quotations.id", ondelete="SET NULL"))
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(default="draft")
    items: Mapped[list] = mapped_column(JSONB, default=list)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    currency: Mapped[str] = mapped_column(default="INR")
    pdf_url: Mapped[str | None] = mapped_column(String)
    customer_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_type: Mapped[str] = mapped_column(nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(default="pending")
    reason: Mapped[str | None] = mapped_column(Text)
    approved_by: Mapped[str | None] = mapped_column(String)
    edited_items: Mapped[list | None] = mapped_column(JSONB)
    decided_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = _updated_at()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    link_type: Mapped[str | None] = mapped_column(String)
    link_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = _created_at()


class PolicyDocument(Base):
    __tablename__ = "policy_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(nullable=False)
    source_filename: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = _created_at()

    chunks: Mapped[list["PolicyDocumentChunk"]] = relationship(back_populates="document", passive_deletes=True)


class PolicyDocumentChunk(Base):
    __tablename__ = "policy_document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    policy_document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policy_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = _created_at()

    document: Mapped["PolicyDocument"] = relationship(back_populates="chunks")
