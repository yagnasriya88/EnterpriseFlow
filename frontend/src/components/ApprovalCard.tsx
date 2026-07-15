"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import type { Approval, Customer, DocumentRecord, LineItem } from "@/lib/api";
import { formatMoney, formatRelativeAge } from "@/lib/format";
import { approveAction, editAndApproveAction, rejectAction } from "@/app/(dashboard)/approvals/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

const TAX_RATE = 0.18;

function recompute(items: LineItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

export function ApprovalCard({
  approval,
  document,
  customer,
  decidedBy,
}: {
  approval: Approval;
  document: DocumentRecord;
  customer: Customer | null;
  decidedBy: string;
}) {
  const [mode, setMode] = useState<"view" | "reject" | "edit">("view");
  const [items, setItems] = useState<LineItem[]>(document.items);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const totals = recompute(items);

  function updateItem(index: number, field: "quantity" | "unit_price", value: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value, line_total: field === "quantity" ? item.unit_price * value : value * item.quantity } : item
      )
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">
            {customer?.name || customer?.phone_number || "Unknown customer"}
          </p>
          <p className="text-body-sm text-neutral-500">
            {document.currency === "INR" ? "" : document.currency + " "}
            {approval.document_type} · {formatMoney(mode === "edit" ? totals.total : document.total, document.currency)}
          </p>
        </div>
        <Badge tone="warning">Waiting {formatRelativeAge(approval.created_at)}</Badge>
      </div>

      <table className="mt-4 w-full text-body-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Unit price</th>
            <th className="pb-2 text-right font-medium">Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t border-neutral-100">
              <td className="py-2 pr-2">
                <div className="text-neutral-800">{item.product_name}</div>
                {item.assumptions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.assumptions.map((a, i) => (
                      <span key={i} title={a.reason}>
                        <Badge tone="warning" className="text-[11px]">
                          assumed {a.field}: {a.assumed_value}
                        </Badge>
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="py-2">
                {mode === "edit" ? (
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value) || 1)}
                    className="w-16 px-2 py-1"
                  />
                ) : (
                  <span className="text-neutral-800">{item.quantity}</span>
                )}
              </td>
              <td className="py-2">
                {mode === "edit" ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1"
                  />
                ) : (
                  <span className="text-neutral-800">{formatMoney(item.unit_price, document.currency)}</span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums text-neutral-800">
                {formatMoney(item.quantity * item.unit_price, document.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mode === "edit" && (
        <p className="mt-2 text-right text-body-sm text-neutral-500">
          New total:{" "}
          <span className="font-medium text-neutral-900">{formatMoney(totals.total, document.currency)}</span> (GST
          18% incl.)
        </p>
      )}

      {mode === "reject" && (
        <div className="mt-4 space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejecting (visible in the audit trail)"
            rows={2}
          />
          <p className="text-body-sm text-neutral-500">
            The customer will get a WhatsApp message letting them know their request wasn&apos;t approved —
            this reason stays internal and isn&apos;t sent to them.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "view" && (
          <>
            <Button
              size="sm"
              icon={Check}
              disabled={isPending}
              onClick={() => startTransition(() => approveAction(approval.id, decidedBy))}
            >
              Approve
            </Button>
            <Button size="sm" variant="secondary" icon={Pencil} disabled={isPending} onClick={() => setMode("edit")}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={X}
              className="border-danger-200 text-danger-600 hover:bg-danger-50"
              disabled={isPending}
              onClick={() => setMode("reject")}
            >
              Reject
            </Button>
          </>
        )}
        {mode === "edit" && (
          <>
            <Button
              size="sm"
              icon={Check}
              disabled={isPending}
              onClick={() =>
                startTransition(() =>
                  editAndApproveAction(approval.id, decidedBy, items, document.customer_message ?? "")
                )
              }
            >
              Save &amp; approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                setItems(document.items);
                setMode("view");
              }}
            >
              Cancel
            </Button>
          </>
        )}
        {mode === "reject" && (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending || reason.trim().length === 0}
              onClick={() => startTransition(() => rejectAction(approval.id, decidedBy, reason))}
            >
              Confirm reject
            </Button>
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => setMode("view")}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
