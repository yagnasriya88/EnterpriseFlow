-- Phase 4: in-app notification center backing store
-- Phase 5: approval audit trail (who decided, edited line items) + stored
--          customer-facing reply text so the approval gate can defer sending
--          the priced document until it's actually approved.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- approval_needed | delivery_failed | customer_replied
  title text not null,
  body text,
  link_type text, -- quotation | invoice | approval | conversation
  link_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check
    check (type in ('approval_needed', 'delivery_failed', 'customer_replied'))
);

create index notifications_is_read_idx on notifications (is_read);
create index notifications_created_at_idx on notifications (created_at desc);

alter table approvals
  add column approved_by text,
  add column edited_items jsonb;

alter table quotations
  add column customer_message text;

alter table invoices
  add column customer_message text;
