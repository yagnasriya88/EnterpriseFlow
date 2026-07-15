"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export async function uploadPolicyDocumentAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const file = formData.get("file");
  if (!title || !(file instanceof File) || file.size === 0) return;

  await api.uploadPolicyDocument(title, file);
  revalidatePath("/settings");
}
