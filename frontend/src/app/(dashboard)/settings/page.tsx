import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { uploadPolicyDocumentAction } from "./actions";

function ConnectionStatus({ label, configured, hint }: { label: string; configured: boolean; hint: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
      <div>
        <p className="font-medium text-black dark:text-zinc-50">{label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          configured
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {configured ? "Connected" : "Not configured"}
      </span>
    </div>
  );
}

export default async function SettingsPage() {
  const [status, policyDocuments] = await Promise.all([
    api.getIntegrationsStatus().catch(() => null),
    api.listPolicyDocuments().catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Connections, tax configuration, and the policy documents the Context agent searches.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Connections</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConnectionStatus
            label="WhatsApp (Twilio)"
            configured={status?.whatsapp_configured ?? false}
            hint="Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_NUMBER in backend/.env"
          />
          <ConnectionStatus
            label="Email alerts (Gmail)"
            configured={status?.gmail_configured ?? false}
            hint="Optional — set GMAIL_ADDRESS / GMAIL_APP_PASSWORD in backend/.env"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Tax &amp; currency</h2>
        <div className="rounded-xl border border-black/[.08] bg-white p-4 text-sm dark:border-white/[.145] dark:bg-zinc-950">
          <p className="text-black dark:text-zinc-50">
            {status ? `${status.currency} · ${(status.tax_rate * 100).toFixed(0)}% GST` : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Hardcoded for MVP — matches the reference model, not currently a per-tenant setting.
          </p>
          <p className="mt-2 text-black dark:text-zinc-50">
            Auto-approval threshold: {status ? `₹${status.auto_approve_threshold.toLocaleString("en-IN")}` : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Set via AUTO_APPROVE_THRESHOLD in backend/.env.</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Policy documents</h2>
        <form
          action={uploadPolicyDocumentAction}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950"
        >
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-xs font-medium text-zinc-500">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              className="block rounded-md border border-black/[.15] bg-transparent px-3 py-1.5 text-sm dark:border-white/[.2]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="file" className="text-xs font-medium text-zinc-500">
              PDF file
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="block text-sm text-zinc-600 dark:text-zinc-400"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-black/85 dark:bg-white dark:text-black"
          >
            Upload &amp; ingest
          </button>
        </form>

        {policyDocuments.length === 0 ? (
          <p className="text-sm text-zinc-500">No policy documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-black/[.06] overflow-hidden rounded-xl border border-black/[.08] bg-white dark:divide-white/[.08] dark:border-white/[.145] dark:bg-zinc-950">
            {policyDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="text-black dark:text-zinc-50">{doc.title}</p>
                  <p className="text-xs text-zinc-500">{doc.source_filename}</p>
                </div>
                <span className="text-xs text-zinc-400">{formatDateTime(doc.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
