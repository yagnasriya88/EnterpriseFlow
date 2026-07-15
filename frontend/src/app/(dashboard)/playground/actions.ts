"use server";

import { api, type AgentMessageResponse } from "@/lib/api";

export async function startPlaygroundSessionAction(): Promise<{
  customerId: string;
  conversationId: string;
}> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const customer = await api.createCustomer({
    name: "Test Customer (Playground)",
    phone_number: `playground-${suffix}`,
  });
  const conversation = await api.createConversation({
    customer_id: customer.id,
    channel: "playground",
  });
  return { customerId: customer.id, conversationId: conversation.id };
}

export async function sendPlaygroundMessageAction(
  customerId: string,
  conversationId: string,
  message: string
): Promise<AgentMessageResponse> {
  return api.sendAgentMessage({ customer_id: customerId, conversation_id: conversationId, message });
}
