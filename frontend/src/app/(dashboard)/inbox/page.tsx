import Link from "next/link";
import { Inbox as InboxIcon } from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
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
        <h1 className="font-display text-heading-lg text-neutral-900">Inbox</h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Every customer conversation the agent pipeline has handled.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState icon={InboxIcon} title="No conversations yet" description="Incoming chats will show up here." />
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          {conversations.map((conversation) => {
            const customer = customerById.get(conversation.customer_id);
            return (
              <li key={conversation.id}>
                <Link
                  href={`/inbox/${conversation.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-100 hover:bg-primary-50/30"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">
                      {customer?.name || customer?.phone_number || "Unknown customer"}
                    </p>
                    <p className="truncate text-body-sm text-neutral-500">
                      {customer?.phone_number} · {conversation.channel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-body-sm text-neutral-400">
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
