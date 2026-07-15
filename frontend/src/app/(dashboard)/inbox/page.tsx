import Link from "next/link";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRelativeAge } from "@/lib/format";

export default async function InboxPage() {
  const [conversations, customers] = await Promise.all([
    api.listConversations().catch(() => []),
    api.listCustomers().catch(() => []),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Inbox</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every customer conversation the agent pipeline has handled.
        </p>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-zinc-500">No conversations yet.</p>
      ) : (
        <ul className="divide-y divide-black/[.06] overflow-hidden rounded-xl border border-black/[.08] bg-white dark:divide-white/[.08] dark:border-white/[.145] dark:bg-zinc-950">
          {conversations.map((conversation) => {
            const customer = customerById.get(conversation.customer_id);
            return (
              <li key={conversation.id}>
                <Link
                  href={`/inbox/${conversation.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-black/[.02] dark:hover:bg-white/[.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black dark:text-zinc-50">
                      {customer?.name || customer?.phone_number || "Unknown customer"}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {customer?.phone_number} · {conversation.channel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-zinc-400">
                      {conversation.last_message_at ? formatRelativeAge(conversation.last_message_at) : "—"}
                    </span>
                    <StatusBadge status={conversation.status} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
