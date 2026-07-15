import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatMoney } from "@/lib/format";

export default async function QuotationsPage() {
  const [quotations, customers] = await Promise.all([
    api.listQuotations().catch(() => []),
    api.listCustomers().catch(() => []),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Quotations</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every quote the agent pipeline has generated, newest first.
        </p>
      </div>

      {quotations.length === 0 ? (
        <p className="text-sm text-zinc-500">No quotations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[.08] text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-white/[.145]">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((quotation) => {
                const customer = customerById.get(quotation.customer_id);
                return (
                  <tr key={quotation.id} className="border-b border-black/[.06] last:border-0 dark:border-white/[.08]">
                    <td className="px-4 py-3 text-black dark:text-zinc-50">
                      {customer?.name || customer?.phone_number || "Unknown"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(quotation.total, quotation.currency)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={quotation.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatDateTime(quotation.created_at)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"}/quotations/${quotation.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-black underline dark:text-zinc-50"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
