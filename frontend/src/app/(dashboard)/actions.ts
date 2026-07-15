"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export async function markNotificationReadAction(id: string) {
  await api.markNotificationRead(id);
  revalidatePath("/", "layout");
}
