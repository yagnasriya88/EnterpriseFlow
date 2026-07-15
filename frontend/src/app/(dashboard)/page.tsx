import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";

const MANUAL_MINUTES_PER_REQUEST = 15; // reference baseline: a person doing this by hand

function StatCard({ label, value, href, hint }: { label: string; value: string; href?: string; hint?: string }) {
  const content = (
    <div className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-sm">
      {content}
    </Link>
  ) : (
    content
  );
}

export default async function OverviewPage() {
  const [conversations, quotations, invoices, pendingApprovals] = await Promise.all([
    api.listConversations().catch(() => []),
    api.listQuotations().catch(() => []),
    api.listInvoices().catch(() => []),
    api.listApprovals("pending").catch(() => []),
  ]);

  const quotedValue = quotations.reduce((sum, q) => sum + q.total, 0);
  const conversionRate = quotations.length > 0 ? Math.round((invoices.length / quotations.length) * 100) : 0;
  const minutesSaved = conversations.length * MANUAL_MINUTES_PER_REQUEST;
  const hoursSaved = (minutesSaved / 60).toFixed(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Overview</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          What the agent pipeline has handled so far.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Time saved"
          value={`~${hoursSaved} hrs`}
          hint={`Estimate: ${conversations.length} requests × ${MANUAL_MINUTES_PER_REQUEST} min manual baseline`}
        />
        <StatCard label="Pending approvals" value={String(pendingApprovals.length)} href="/approvals" />
        <StatCard label="Conversations" value={String(conversations.length)} href="/inbox" />
        <StatCard label="Quote → invoice rate" value={`${conversionRate}%`} href="/analytics" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total quoted value" value={formatMoney(quotedValue)} href="/quotations" />
        <StatCard label="Invoices issued" value={String(invoices.length)} href="/invoices" />
      </div>
    </div>
  );
}
