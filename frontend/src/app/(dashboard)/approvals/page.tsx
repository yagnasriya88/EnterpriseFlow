import { CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "@/components/ApprovalCard";
import { EmptyState } from "@/components/ui/EmptyState";

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
        <h1 className="font-display text-heading-lg text-neutral-900">Approvals</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Documents above the auto-approval threshold, oldest first. Nothing here reaches the customer until you
          decide.
        </p>
      </div>

      {oldestFirst.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing waiting on you" description="Approved and rejected documents move out of this queue automatically." />
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
