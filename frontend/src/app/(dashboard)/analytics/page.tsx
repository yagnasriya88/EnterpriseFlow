import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-black dark:text-zinc-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const [quotations, invoices, approvals, conversations] = await Promise.all([
    api.listQuotations().catch(() => []),
    api.listInvoices().catch(() => []),
    api.listApprovals().catch(() => []),
    api.listConversations().catch(() => []),
  ]);

  const totalDocuments = quotations.length + invoices.length;
  const autoApprovedCount = Math.max(totalDocuments - approvals.length, 0);
  const autoApprovalRate = totalDocuments > 0 ? Math.round((autoApprovedCount / totalDocuments) * 100) : 0;

  const decided = approvals.filter((a) => a.decided_at);
  const avgTurnaroundMinutes =
    decided.length > 0
      ? Math.round(
          decided.reduce(
            (sum, a) => sum + (new Date(a.decided_at!).getTime() - new Date(a.created_at).getTime()) / 60000,
            0
          ) / decided.length
        )
      : null;

  const quotedValue = quotations.reduce((sum, q) => sum + q.total, 0);
  const invoicedValue = invoices.reduce((sum, i) => sum + i.total, 0);
  const conversionRate = quotations.length > 0 ? Math.round((invoices.length / quotations.length) * 100) : 0;
  const avgQuoteValue = quotations.length > 0 ? quotedValue / quotations.length : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Operational health of the pipeline, and the business outcomes it's producing.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Operational</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Conversations handled" value={String(conversations.length)} />
          <Stat label="Auto-approval rate" value={`${autoApprovalRate}%`} hint="Documents that never needed a human" />
          <Stat label="Approvals raised" value={String(approvals.length)} />
          <Stat
            label="Avg. approval turnaround"
            value={avgTurnaroundMinutes === null ? "—" : `${avgTurnaroundMinutes} min`}
            hint="Time from queued to decided"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Business</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total quoted value" value={formatMoney(quotedValue)} />
          <Stat label="Total invoiced value" value={formatMoney(invoicedValue)} />
          <Stat label="Quote → invoice conversion" value={`${conversionRate}%`} />
          <Stat label="Avg. quote value" value={formatMoney(avgQuoteValue)} />
        </div>
      </section>
    </div>
  );
}
