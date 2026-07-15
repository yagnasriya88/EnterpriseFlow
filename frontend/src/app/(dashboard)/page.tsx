import { Clock, CheckCircle2, MessageSquare, TrendingUp, Wallet, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";

const MANUAL_MINUTES_PER_REQUEST = 15; // reference baseline: a person doing this by hand

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
        <h1 className="font-display text-heading-lg text-neutral-900">Overview</h1>
        <p className="mt-1 text-body-sm text-neutral-500">What the agent pipeline has handled so far.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Time saved"
          value={`~${hoursSaved} hrs`}
          hint={`Estimate: ${conversations.length} requests × ${MANUAL_MINUTES_PER_REQUEST} min manual baseline`}
          icon={Clock}
          tone="accent"
        />
        <StatCard
          label="Pending approvals"
          value={String(pendingApprovals.length)}
          href="/approvals"
          icon={CheckCircle2}
          tone="warning"
        />
        <StatCard
          label="Conversations"
          value={String(conversations.length)}
          href="/inbox"
          icon={MessageSquare}
          tone="primary"
        />
        <StatCard
          label="Quote → invoice rate"
          value={`${conversionRate}%`}
          href="/analytics"
          icon={TrendingUp}
          tone="info"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Total quoted value"
          value={formatMoney(quotedValue)}
          href="/quotations"
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Invoices issued"
          value={String(invoices.length)}
          href="/invoices"
          icon={Receipt}
          tone="success"
        />
      </div>
    </div>
  );
}
