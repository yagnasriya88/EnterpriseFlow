"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/api";
import { formatRelativeAge } from "@/lib/format";
import { markNotificationReadAction } from "@/app/(dashboard)/actions";
import { cn } from "@/lib/cn";
import { transitionFast } from "@/lib/motion";

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
        className="relative rounded-full p-2 text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={transitionFast}
              className="absolute right-0 z-20 mt-2 w-80 max-w-[90vw] rounded-lg border border-neutral-200 bg-white p-2 shadow-lg"
            >
              {notifications.length === 0 ? (
                <p className="p-3 text-body-sm text-neutral-500">No notifications yet.</p>
              ) : (
                <ul className="max-h-96 space-y-1 overflow-y-auto">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={cn("rounded-md p-3 text-body-sm", n.is_read ? "opacity-50" : "bg-primary-50/50")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900">
                            {TYPE_LABEL[n.type]}: {n.title}
                          </p>
                          {n.body && <p className="mt-0.5 truncate text-neutral-600">{n.body}</p>}
                          <p className="mt-1 text-body-sm text-neutral-400">{formatRelativeAge(n.created_at)}</p>
                        </div>
                        {!n.is_read && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => startTransition(() => markNotificationReadAction(n.id))}
                            className="shrink-0 text-body-sm text-neutral-500 hover:text-primary-700 disabled:opacity-50"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
