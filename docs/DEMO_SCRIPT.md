# EnterpriseFlow demo walkthrough

A ~5 minute walkthrough of the full loop: customer message in → agent
pipeline → human approval → delivery. Assumes the local stack is running
(`scripts/dev.ps1` / `scripts/dev.sh`) and at least one product catalog is
seeded (`backend/scripts/seed_products.py`).

## 1. Set the stage (30s)

Open the dashboard at `http://localhost:3000`, sign in with the admin
account. Land on **Overview** — point out the headline stats are real
numbers pulled from Postgres, not placeholders, and "Time saved" is an
explicit estimate (manual baseline × requests handled), labeled as such.

## 2. A request comes in (60s)

Trigger a message through the pipeline. Two ways depending on what's wired up:

- **With a live Twilio sandbox**: send a WhatsApp message to the sandbox
  number, e.g. *"Hi, can I get a quote for 2 ceramic coffee mugs?"*
- **Without Twilio** (simulating the same path): `POST /agent/message` with a
  `conversation_id`/`customer_id` from `/conversations` and `/customers`, same
  effect minus the WhatsApp round-trip.

Show the reply arriving with a priced quote, an assumption called out in
plain language (e.g. "assumed the medium size since you didn't specify").
Open **Inbox** in the dashboard and show the same conversation thread.

## 3. Auto-approval vs. human review (60s)

Send a second request that's deliberately large, e.g. *"I need 500 throw
pillows for a hotel order, please quote me."* The reply this time is
generic — no price, no line items — because it's over the auto-approval
threshold. This is the point: **nothing priced reaches the customer until a
human signs off.**

Open **Approvals** and show the same request sitting in the queue, oldest
first, with the real line items, assumption chips, and total visible only to
the approver.

## 4. Decide it (60s)

Three things to show on one approval card:

- **Edit**: bump a quantity, watch the total recompute live, "Save & approve."
- **Reject**: (on a different item) type a reason, confirm — the customer
  gets nothing.
- **Approve**: the customer's WhatsApp thread updates with the actual priced
  quote, sent only now.

Point out the **notification bell** picked up an "approval needed" alert
when the request first landed, and mark it read.

## 5. Paper trail (60s)

Open **Quotations**, find the approved one, click **View** — a generated PDF
with the same line items, GST breakdown, and the note that went to the
customer. Open **Analytics** and show the auto-approval rate and average
approval turnaround updating to reflect what just happened.

## 6. Settings (30s)

Open **Settings** — show the WhatsApp/Gmail connection status (real
booleans from the backend, no secrets exposed), the hardcoded GST rate, and
the policy document library the Context agent searches against.

## What's deliberately not shown

- Live Twilio delivery — the pipeline is fully wired for it, but no sandbox
  is connected in this environment (see `PLAN.md` Phase 3).
- Multi-role access (Owner/Approver/Viewer) — single admin login for this
  single-tenant MVP; see `PLAN.md` Phase 6.
- A production deployment — `DEPLOYMENT.md` has the checklist; nothing has
  been pushed to Railway/Vercel/hosted Supabase yet.
