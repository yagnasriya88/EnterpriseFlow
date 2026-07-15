import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "@/components/ApprovalCard";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const decidedBy = user?.email ?? "admin";

  const approvals = await api.listApprovals("pending").catch(() => []);
  const oldestFirst = [...approvals].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const documents = await Promise.all(
    oldestFirst.map((approval) =>
      approval.document_type === "invoice" ? api.getInvoice(approval.document_id) : api.getQuotation(approval.document_id)
    )
  );
  const customers = await Promise.all(documents.map((doc) => api.getCustomer(doc.customer_id).catch(() => null)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Approvals</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Documents above the auto-approval threshold, oldest first. Nothing here reaches the customer until you
          decide.
        </p>
      </div>

      {oldestFirst.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing waiting on you right now.</p>
      ) : (
        <div className="space-y-4">
          {oldestFirst.map((approval, index) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              document={documents[index]}
              customer={customers[index]}
              decidedBy={decidedBy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
