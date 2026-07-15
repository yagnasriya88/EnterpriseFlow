import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export default async function ConversationThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const conversation = await api.getConversation(id).catch(() => null);
  if (!conversation) notFound();

  const [customer, messages] = await Promise.all([
    api.getCustomer(conversation.customer_id).catch(() => null),
    api.listMessages(id).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1 text-body-sm text-neutral-500 hover:text-primary-600"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Inbox
        </Link>
        <h1 className="mt-2 font-display text-heading-lg text-neutral-900">
          {customer?.name || customer?.phone_number || "Unknown customer"}
        </h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          {customer?.phone_number} · {conversation.channel}
        </p>
      </div>

      <div className="space-y-3">
        {messages.length === 0 && <p className="text-body-sm text-neutral-500">No messages yet.</p>}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-xl rounded-lg px-4 py-3 text-body-sm",
              message.direction === "inbound"
                ? "border border-neutral-200 bg-white shadow-xs"
                : "ml-auto bg-primary-600 text-white shadow-sm"
            )}
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
            <p
              className={cn(
                "mt-1.5 text-[11px]",
                message.direction === "inbound" ? "text-neutral-400" : "text-white/70"
              )}
            >
              {formatDateTime(message.created_at)}
              {message.agent ? ` · ${message.agent}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
