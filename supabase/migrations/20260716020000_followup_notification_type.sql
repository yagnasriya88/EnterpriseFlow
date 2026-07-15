-- Staff-initiated WhatsApp follow-ups (app.services.followups) raise a
-- "followup_sent" notification on a successful send, alongside the existing
-- "delivery_failed" path it shares with the approval workflow. Extend the
-- check constraint rather than dropping it, per the project's audit-trail
-- convention of never silently widening notification types.

alter table notifications drop constraint notifications_type_check;

alter table notifications
  add constraint notifications_type_check
    check (type in ('approval_needed', 'delivery_failed', 'customer_replied', 'followup_sent'));
