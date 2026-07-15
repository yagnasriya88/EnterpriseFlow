"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  CheckCircle2,
  FileText,
  Receipt,
  Package,
  BarChart3,
  Settings as SettingsIcon,
  MessageCircle,
  MessageCircleReply,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };

function navItems(pendingApprovals: number, unreadNotifications: number): NavItem[] {
  return [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/inbox", label: "Inbox", icon: InboxIcon, badge: unreadNotifications },
    { href: "/approvals", label: "Approvals", icon: CheckCircle2, badge: pendingApprovals },
    { href: "/quotations", label: "Quotations", icon: FileText },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/products", label: "Catalog", icon: Package },
    { href: "/playground", label: "Agent Playground", icon: MessageCircle },
    { href: "/followups", label: "Follow-ups", icon: MessageCircleReply },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];
}

function NavBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1.5 text-[11px] font-semibold text-white">
      {count}
    </span>
  );
}

export function Sidebar({
  pendingApprovals,
  unreadNotifications,
}: {
  pendingApprovals: number;
  unreadNotifications: number;
}) {
  const items = navItems(pendingApprovals, unreadNotifications);
  const pathname = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-white shadow-[1px_0_0_rgba(67,56,202,0.03),4px_0_20px_rgba(23,27,38,0.03)] md:flex">
      <div className="px-5 py-5 font-display text-heading-md text-neutral-900">EnterpriseFlow</div>
      <div className="flex-1 space-y-0.5 px-3">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center justify-between rounded-md py-2 pl-3.5 pr-3 text-body-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300",
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-4.5 w-1 -translate-y-1/2 rounded-full bg-primary-600" />
              )}
              <span className="flex items-center gap-2.5">
                <Icon className={cn("size-4", active ? "text-primary-600" : "text-neutral-400")} aria-hidden="true" />
                {label}
              </span>
              <NavBadge count={badge ?? 0} />
            </Link>
          );
        })}
      </div>
      <div className="border-t border-neutral-200 px-5 py-4 text-body-sm text-neutral-400">
        Single-tenant · GST 18%
      </div>
    </nav>
  );
}

export function MobileTabBar({ pendingApprovals }: { pendingApprovals: number }) {
  const pathname = usePathname();
  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-body-sm font-medium",
      active ? "text-primary-600" : "text-neutral-500"
    );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-neutral-200 bg-white shadow-[0_-4px_16px_rgba(23,27,38,0.04)] md:hidden">
      <Link href="/inbox" className={tabClass(pathname.startsWith("/inbox"))}>
        <InboxIcon className="size-5" aria-hidden="true" />
        Inbox
      </Link>
      <Link href="/approvals" className={tabClass(pathname.startsWith("/approvals"))}>
        <span className="relative">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {pendingApprovals > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
              {pendingApprovals}
            </span>
          )}
        </span>
        Approvals
      </Link>
      <Link href="/playground" className={tabClass(pathname.startsWith("/playground"))}>
        <MessageCircle className="size-5" aria-hidden="true" />
        Playground
      </Link>
    </nav>
  );
}
