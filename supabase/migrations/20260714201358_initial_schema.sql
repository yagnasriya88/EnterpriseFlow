-- EnterpriseFlow initial schema
-- Phase 1: Core Business Data Layer
-- Tables: products, customers, conversations, conversation_messages,
--         quotations, invoices, approvals, policy_documents, policy_document_chunks

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector, for policy_document_chunks.embedding

-- Shared trigger to keep updated_at current on every row update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  price numeric(10,2) not null,
  cost numeric(10,2),
  category text,
  stock_quantity integer not null default 0,
  weight_grams integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

create index products_category_idx on products (category);
create index products_is_active_idx on products (is_active);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone_number text not null unique, -- WhatsApp number, E.164 format
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations + conversation_messages
-- ---------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  channel text not null default 'whatsapp',
  status text not null default 'active', -- active | closed
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_status_check check (status in ('active', 'closed'))
);

create trigger conversations_set_updated_at
  before update on conversations
  for each row execute function set_updated_at();

create index conversations_customer_id_idx on conversations (customer_id);
create index conversations_status_idx on conversations (status);

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  direction text not null, -- inbound | outbound
  body text not null,
  agent text, -- which agent/step produced an outbound message, if any
  created_at timestamptz not null default now(),
  constraint conversation_messages_direction_check check (direction in ('inbound', 'outbound'))
);

create index conversation_messages_conversation_id_idx on conversation_messages (conversation_id);

-- ---------------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------------
create table quotations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations (id) on delete set null,
  customer_id uuid not null references customers (id) on delete cascade,
  status text not null default 'draft', -- draft | pending_approval | approved | rejected | sent
  items jsonb not null default '[]'::jsonb, -- [{product_id, sku, name, qty, unit_price, assumptions}]
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'INR',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_status_check
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'sent'))
);

create trigger quotations_set_updated_at
  before update on quotations
  for each row execute function set_updated_at();

create index quotations_customer_id_idx on quotations (customer_id);
create index quotations_status_idx on quotations (status);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references quotations (id) on delete set null,
  conversation_id uuid references conversations (id) on delete set null,
  customer_id uuid not null references customers (id) on delete cascade,
  status text not null default 'draft', -- draft | pending_approval | approved | rejected | sent
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'INR',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_status_check
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'sent'))
);

create trigger invoices_set_updated_at
  before update on invoices
  for each row execute function set_updated_at();

create index invoices_customer_id_idx on invoices (customer_id);
create index invoices_status_idx on invoices (status);

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------
create table approvals (
  id uuid primary key default gen_random_uuid(),
  document_type text not null, -- quotation | invoice
  document_id uuid not null,
  status text not null default 'pending', -- pending | approved | rejected | edited
  reason text, -- rejection/edit reason
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approvals_document_type_check check (document_type in ('quotation', 'invoice')),
  constraint approvals_status_check check (status in ('pending', 'approved', 'rejected', 'edited'))
);

create trigger approvals_set_updated_at
  before update on approvals
  for each row execute function set_updated_at();

create index approvals_document_idx on approvals (document_type, document_id);
create index approvals_status_idx on approvals (status);

-- ---------------------------------------------------------------------------
-- policy_documents + policy_document_chunks (pgvector RAG source)
-- ---------------------------------------------------------------------------
create table policy_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_filename text,
  created_at timestamptz not null default now()
);

create table policy_document_chunks (
  id uuid primary key default gen_random_uuid(),
  policy_document_id uuid not null references policy_documents (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamptz not null default now()
);

create index policy_document_chunks_document_id_idx on policy_document_chunks (policy_document_id);

-- ivfflat index for approximate nearest-neighbor search once there's enough data;
-- harmless (and fast) to create against an empty table.
create index policy_document_chunks_embedding_idx
  on policy_document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
