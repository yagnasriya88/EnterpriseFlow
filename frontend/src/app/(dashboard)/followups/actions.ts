"use server";

import { revalidatePath } from "next/cache";
import { api, type FollowUpCandidate } from "@/lib/api";

export async function searchFollowUpsAction(description: string): Promise<FollowUpCandidate[]> {
  const { candidates } = await api.searchFollowUps(description);
  return candidates;
}

export async function sendFollowUpAction(candidate: FollowUpCandidate, message: string): Promise<boolean> {
  const { sent } = await api.sendFollowUp({
    document_type: candidate.document_type,
    document_id: candidate.document_id,
    conversation_id: candidate.conversation_id,
    customer_id: candidate.customer_id,
    message,
  });
  if (candidate.conversation_id) {
    revalidatePath(`/inbox/${candidate.conversation_id}`);
  }
  revalidatePath("/", "layout");
  return sent;
}
