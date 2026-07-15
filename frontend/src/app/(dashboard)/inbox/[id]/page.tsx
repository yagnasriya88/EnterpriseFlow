import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
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
        <Link href="/inbox" className="text-sm text-zinc-500 hover:text-black dark:hover:text-zinc-50">
          ← Inbox
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {customer?.name || customer?.phone_number || "Unknown customer"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {customer?.phone_number} · {conversation.channel}
        </p>
      </div>

      <div className="space-y-3">
        {messages.length === 0 && <p className="text-sm text-zinc-500">No messages yet.</p>}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-xl rounded-xl px-4 py-3 text-sm ${
              message.direction === "inbound"
                ? "bg-white border border-black/[.08] dark:bg-zinc-950 dark:border-white/[.145]"
                : "ml-auto bg-black text-white dark:bg-white dark:text-black"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
            <p
              className={`mt-1.5 text-xs ${
                message.direction === "inbound" ? "text-zinc-400" : "text-white/60 dark:text-black/60"
              }`}
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
