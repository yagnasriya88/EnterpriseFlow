# Deployment

Everything here is prepared but **not yet executed** — it needs accounts/credentials
only the project owner has (Render, Vercel, a hosted Supabase project). This
doc is the checklist for whoever runs that step.

## 1. Hosted Supabase (Postgres + pgvector)

1. Create a project at https://supabase.com (free tier is enough to start —
   see PLAN.md Phase 7 for the free-tier limits to watch: 500MB storage,
   auto-pause after a week idle, no automatic backups).
2. Push the schema: `npx supabase link --project-ref <ref>` then
   `npx supabase db push` from the repo root — this applies every file in
   `supabase/migrations/` in order, including the pgvector extension and the
   notifications/approval-audit tables added in this pass.
3. Copy the connection string, API URL, anon key, and service role key from
   the project's Settings → API / Database pages.

## 2. Backend → Render

1. In the Render dashboard: **New → Blueprint**, connect the GitHub repo.
   Render finds `render.yaml` at the repo root automatically — it points at
   `backend/` as the Docker build context, so `backend/Dockerfile` is built
   as-is, no changes needed. (Alternative: **New → Web Service**, connect the
   repo, set root directory to `backend/`, runtime "Docker" — same result
   without the Blueprint file.)
2. Set environment variables (Render service → Environment), same names as
   `backend/.env.example` — `render.yaml` declares these keys with
   `sync: false` so Render prompts for each value instead of guessing one:
   - `DATABASE_URL` — the hosted Supabase Postgres connection string, with
     the `postgresql+asyncpg://` scheme (not the plain `postgresql://` Supabase
     shows by default)
   - `OPENAI_API_KEY`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
   - `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD`, `NOTIFY_TO_EMAIL` (optional)
   - `AUTO_APPROVE_THRESHOLD` (optional, defaults to 5000)
3. Deploy. Render assigns a public URL (`https://<service>.onrender.com`) and
   injects `$PORT` — the Dockerfile already reads it. `render.yaml` sets
   `healthCheckPath: /health`, so Render waits for that to return 200 before
   marking a deploy live.
4. Point the Twilio WhatsApp sandbox webhook at
   `https://<service>.onrender.com/webhooks/whatsapp`.
5. Note the free/starter Render plan spins down after 15 minutes idle and
   takes ~30-60s to cold-start on the next request — fine for a demo, but if
   the WhatsApp webhook needs to respond promptly in production, upgrade the
   plan (edit `plan:` in `render.yaml`, or change it in the dashboard) so the
   service stays warm.

## 3. Frontend → Vercel

1. Import the repo in Vercel, set the project root to `frontend/`. Next.js is
   auto-detected — no vercel.json needed.
2. Set environment variables, same names as `frontend/.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL` — the hosted Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the hosted project's anon key
   - `BACKEND_URL` — the Render backend URL (server-side only)
   - `NEXT_PUBLIC_BACKEND_URL` — the same Render backend URL (used for the
     browser-facing PDF download links)
3. Create the admin user against the **hosted** project once it exists (the
   local one only works against the local stack):
   ```
   curl -X POST '<SUPABASE_URL>/auth/v1/admin/users' \
     -H "apikey: <service_role_key>" \
     -H "Authorization: Bearer <service_role_key>" \
     -H "Content-Type: application/json" \
     -d '{"email":"<admin-email>","password":"<admin-password>","email_confirm":true}'
   ```
4. Deploy.

## 4. CI

`.github/workflows/ci.yml` runs on every push/PR: backend tests against a
throwaway Postgres+pgvector service container (migrations applied fresh each
run), plus frontend lint + build. Add an `OPENAI_API_KEY` repository secret to
also exercise the LLM-dependent test cases in CI — without it they skip
cleanly (see `backend/tests/test_e2e.py`).

## Not done here

Nothing above has actually been run against real Render/Vercel/hosted-Supabase
infrastructure — that requires accounts this environment doesn't have. The
Dockerfile, render.yaml, and CI workflow are built and the CI job itself has
been verified to pass against a local equivalent, but a live deploy is the
remaining step, and it's the project owner's to trigger.
