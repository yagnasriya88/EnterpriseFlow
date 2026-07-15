import Link from "next/link";

type NavItem = { href: string; label: string; badge?: number };

function navItems(pendingApprovals: number, unreadNotifications: number): NavItem[] {
  return [
    { href: "/", label: "Overview" },
    { href: "/inbox", label: "Inbox", badge: unreadNotifications },
    { href: "/approvals", label: "Approvals", badge: pendingApprovals },
    { href: "/quotations", label: "Quotations" },
    { href: "/invoices", label: "Invoices" },
    { href: "/products", label: "Catalog" },
    { href: "/analytics", label: "Analytics" },
    { href: "/settings", label: "Settings" },
  ];
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">
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
  return (
    <nav className="hidden w-56 shrink-0 flex-col border-r border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950 md:flex">
      <div className="px-5 py-5 text-base font-semibold tracking-tight text-black dark:text-zinc-50">
        EnterpriseFlow
      </div>
      <div className="flex-1 space-y-0.5 px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-zinc-700 transition hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            <span>{item.label}</span>
            <Badge count={item.badge ?? 0} />
          </Link>
        ))}
      </div>
      <div className="border-t border-black/[.08] px-5 py-4 text-xs text-zinc-400 dark:border-white/[.145]">
        Single-tenant · GST 18%
      </div>
    </nav>
  );
}

export function MobileTabBar({ pendingApprovals }: { pendingApprovals: number }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950 md:hidden">
      <Link href="/inbox" className="flex-1 py-3 text-center text-sm text-zinc-700 dark:text-zinc-300">
        Inbox
      </Link>
      <Link href="/approvals" className="flex-1 py-3 text-center text-sm text-zinc-700 dark:text-zinc-300">
        Approvals
        <Badge count={pendingApprovals} />
      </Link>
    </nav>
  );
}
