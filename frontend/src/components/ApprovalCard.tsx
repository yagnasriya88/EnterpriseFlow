"use client";

import { useState, useTransition } from "react";
import type { Approval, Customer, DocumentRecord, LineItem } from "@/lib/api";
import { formatMoney, formatRelativeAge } from "@/lib/format";
import { approveAction, editAndApproveAction, rejectAction } from "@/app/(dashboard)/approvals/actions";

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
    <div className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-black dark:text-zinc-50">
            {customer?.name || customer?.phone_number || "Unknown customer"}
          </p>
          <p className="text-sm text-zinc-500">
            {document.currency === "INR" ? "" : document.currency + " "}
            {approval.document_type} · {formatMoney(mode === "edit" ? totals.total : document.total, document.currency)}
          </p>
        </div>
        <span className="text-xs text-zinc-400">Waiting {formatRelativeAge(approval.created_at)}</span>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Unit price</th>
            <th className="pb-2 text-right font-medium">Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t border-black/[.06] dark:border-white/[.08]">
              <td className="py-2 pr-2">
                <div>{item.product_name}</div>
                {item.assumptions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.assumptions.map((a, i) => (
                      <span
                        key={i}
                        title={a.reason}
                        className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                      >
                        assumed {a.field}: {a.assumed_value}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="py-2">
                {mode === "edit" ? (
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value) || 1)}
                    className="w-16 rounded border border-black/[.15] bg-transparent px-2 py-1 text-sm dark:border-white/[.2]"
                  />
                ) : (
                  item.quantity
                )}
              </td>
              <td className="py-2">
                {mode === "edit" ? (
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", Number(e.target.value) || 0)}
                    className="w-24 rounded border border-black/[.15] bg-transparent px-2 py-1 text-sm dark:border-white/[.2]"
                  />
                ) : (
                  formatMoney(item.unit_price, document.currency)
                )}
              </td>
              <td className="py-2 text-right">{formatMoney(item.quantity * item.unit_price, document.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {mode === "edit" && (
        <p className="mt-2 text-right text-sm text-zinc-500">
          New total: <span className="font-medium text-black dark:text-zinc-50">{formatMoney(totals.total, document.currency)}</span>{" "}
          (GST 18% incl.)
        </p>
      )}

      {mode === "reject" && (
        <div className="mt-4 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejecting (visible in the audit trail)"
            rows={2}
            className="w-full rounded-md border border-black/[.15] bg-transparent px-3 py-2 text-sm dark:border-white/[.2]"
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "view" && (
          <>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => approveAction(approval.id, decidedBy))}
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Approve
            </button>
            <button
              disabled={isPending}
              onClick={() => setMode("edit")}
              className="rounded-md border border-black/[.15] px-3 py-1.5 text-sm text-black transition hover:bg-black/5 disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/10"
            >
              Edit
            </button>
            <button
              disabled={isPending}
              onClick={() => setMode("reject")}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Reject
            </button>
          </>
        )}
        {mode === "edit" && (
          <>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(() =>
                  editAndApproveAction(approval.id, decidedBy, items, document.customer_message ?? "")
                )
              }
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Save &amp; approve
            </button>
            <button
              disabled={isPending}
              onClick={() => {
                setItems(document.items);
                setMode("view");
              }}
              className="rounded-md border border-black/[.15] px-3 py-1.5 text-sm text-black transition hover:bg-black/5 disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </>
        )}
        {mode === "reject" && (
          <>
            <button
              disabled={isPending || reason.trim().length === 0}
              onClick={() => startTransition(() => rejectAction(approval.id, decidedBy, reason))}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Confirm reject
            </button>
            <button
              disabled={isPending}
              onClick={() => setMode("view")}
              className="rounded-md border border-black/[.15] px-3 py-1.5 text-sm text-black transition hover:bg-black/5 disabled:opacity-50 dark:border-white/[.2] dark:text-zinc-50 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
