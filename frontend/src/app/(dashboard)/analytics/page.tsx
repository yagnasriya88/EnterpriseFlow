import { MessageSquare, Sparkles, CheckCircle2, Timer, Wallet, Receipt, TrendingUp, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/ui/StatCard";
import { formatMoney } from "@/lib/format";

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
        <h1 className="font-display text-heading-lg text-neutral-900">Analytics</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Operational health of the pipeline, and the business outcomes it's producing.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-neutral-400">Operational</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Conversations handled" value={String(conversations.length)} icon={MessageSquare} tone="primary" />
          <StatCard
            label="Auto-approval rate"
            value={`${autoApprovalRate}%`}
            hint="Documents that never needed a human"
            icon={Sparkles}
            tone="accent"
          />
          <StatCard label="Approvals raised" value={String(approvals.length)} icon={CheckCircle2} tone="warning" />
          <StatCard
            label="Avg. approval turnaround"
            value={avgTurnaroundMinutes === null ? "—" : `${avgTurnaroundMinutes} min`}
            hint="Time from queued to decided"
            icon={Timer}
            tone="info"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-neutral-400">Business</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total quoted value" value={formatMoney(quotedValue)} icon={Wallet} tone="primary" />
          <StatCard label="Total invoiced value" value={formatMoney(invoicedValue)} icon={Receipt} tone="success" />
          <StatCard label="Quote → invoice conversion" value={`${conversionRate}%`} icon={TrendingUp} tone="info" />
          <StatCard label="Avg. quote value" value={formatMoney(avgQuoteValue)} icon={FileText} tone="accent" />
        </div>
      </section>
    </div>
  );
}
