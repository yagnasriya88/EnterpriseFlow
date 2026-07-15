"use client";

import { useState, useTransition } from "react";
import type { Notification } from "@/lib/api";
import { formatRelativeAge } from "@/lib/format";
import { markNotificationReadAction } from "@/app/(dashboard)/actions";

const TYPE_LABEL: Record<Notification["type"], string> = {
  approval_needed: "Approval needed",
  delivery_failed: "Delivery failed",
  customer_replied: "New message",
};

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-zinc-600 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-lg border border-black/[.08] bg-white p-2 shadow-lg dark:border-white/[.145] dark:bg-zinc-950">
            {notifications.length === 0 ? (
              <p className="p-3 text-sm text-zinc-500">No notifications yet.</p>
            ) : (
              <ul className="max-h-96 space-y-1 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-md p-3 text-sm ${n.is_read ? "opacity-50" : "bg-black/[.02] dark:bg-white/[.04]"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-black dark:text-zinc-50">
                          {TYPE_LABEL[n.type]}: {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 truncate text-zinc-600 dark:text-zinc-400">{n.body}</p>
                        )}
                        <p className="mt-1 text-xs text-zinc-400">{formatRelativeAge(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => startTransition(() => markNotificationReadAction(n.id))}
                          className="shrink-0 text-xs text-zinc-500 hover:text-black disabled:opacity-50 dark:hover:text-zinc-50"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
