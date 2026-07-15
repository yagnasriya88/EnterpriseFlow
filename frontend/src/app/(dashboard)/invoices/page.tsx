import { Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { formatDateTime, formatMoney } from "@/lib/format";

export default async function InvoicesPage() {
  const [invoices, customers] = await Promise.all([
    api.listInvoices().catch(() => []),
    api.listCustomers().catch(() => []),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-heading-lg text-neutral-900">Invoices</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Every invoice the agent pipeline has generated, newest first.
        </p>
      </div>

      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Issued invoices will show up here." />
      ) : (
        <Table>
          <Thead>
            <Th>Customer</Th>
            <Th>Total</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>PDF</Th>
          </Thead>
          <tbody>
            {invoices.map((invoice) => {
              const customer = customerById.get(invoice.customer_id);
              return (
                <Tr key={invoice.id}>
                  <Td className="font-medium text-neutral-900">
                    {customer?.name || customer?.phone_number || "Unknown"}
                  </Td>
                  <Td className="tabular-nums">{formatMoney(invoice.total, invoice.currency)}</Td>
                  <Td>
                    <StatusBadge status={invoice.status} />
                  </Td>
                  <Td className="text-neutral-500">{formatDateTime(invoice.created_at)}</Td>
                  <Td>
                    <a
                      href={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"}/invoices/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
                    >
                      View
                    </a>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
