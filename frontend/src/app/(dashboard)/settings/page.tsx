import { FileText, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { uploadPolicyDocumentAction } from "./actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

function ConnectionStatus({ label, configured, hint }: { label: string; configured: boolean; hint: string }) {
  return (
    <Card className="flex items-center justify-between p-4">
      <div>
        <p className="font-medium text-neutral-900">{label}</p>
        <p className="mt-0.5 text-body-sm text-neutral-500">{hint}</p>
      </div>
      <Badge tone={configured ? "success" : "neutral"}>{configured ? "Connected" : "Not configured"}</Badge>
    </Card>
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
        <h1 className="font-display text-heading-lg text-neutral-900">Settings</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Connections, tax configuration, and the policy documents the Context agent searches.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-neutral-400">Connections</h2>
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
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-neutral-400">Tax &amp; currency</h2>
        <Card className="p-4 text-body-sm">
          <p className="text-neutral-900">
            {status ? `${status.currency} · ${(status.tax_rate * 100).toFixed(0)}% GST` : "—"}
          </p>
          <p className="mt-1 text-body-sm text-neutral-500">
            Hardcoded for MVP — matches the reference model, not currently a per-tenant setting.
          </p>
          <p className="mt-2 text-neutral-900">
            Auto-approval threshold: {status ? `₹${status.auto_approve_threshold.toLocaleString("en-IN")}` : "—"}
          </p>
          <p className="mt-1 text-body-sm text-neutral-500">Set via AUTO_APPROVE_THRESHOLD in backend/.env.</p>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-neutral-400">Policy documents</h2>
        <form
          action={uploadPolicyDocumentAction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
        >
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-body-sm font-medium text-neutral-500">
              Title
            </label>
            <Input id="title" name="title" required className="w-48" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="file" className="text-body-sm font-medium text-neutral-500">
              PDF file
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="block text-body-sm text-neutral-600 file:mr-3 file:rounded-sm file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-body-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          <Button type="submit">
            <Upload className="size-4" aria-hidden="true" />
            Upload &amp; ingest
          </Button>
        </form>

        {policyDocuments.length === 0 ? (
          <EmptyState icon={FileText} title="No policy documents yet" description="Upload a PDF to give the Context agent something to search." />
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            {policyDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3 text-body-sm">
                <div>
                  <p className="text-neutral-900">{doc.title}</p>
                  <p className="text-body-sm text-neutral-500">{doc.source_filename}</p>
                </div>
                <span className="text-body-sm text-neutral-400">{formatDateTime(doc.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
