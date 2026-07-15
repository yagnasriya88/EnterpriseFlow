"use server";

import { revalidatePath } from "next/cache";
import { api, type LineItem } from "@/lib/api";

function refresh() {
  revalidatePath("/approvals");
  revalidatePath("/", "layout");
}

export async function approveAction(approvalId: string, decidedBy: string) {
  await api.decideApproval(approvalId, { action: "approve", decided_by: decidedBy });
  refresh();
}

export async function rejectAction(approvalId: string, decidedBy: string, reason: string) {
  await api.decideApproval(approvalId, { action: "reject", decided_by: decidedBy, reason });
  refresh();
}

export async function editAndApproveAction(
  approvalId: string,
  decidedBy: string,
  items: LineItem[],
  customerMessage: string
) {
  await api.decideApproval(approvalId, {
    action: "edit",
    decided_by: decidedBy,
    edited_items: items,
    edited_customer_message: customerMessage,
  });
  refresh();
}
