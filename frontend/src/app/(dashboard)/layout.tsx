import { api } from "@/lib/api";
import { logout } from "@/app/login/actions";
import { MobileTabBar, Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [approvals, notifications] = await Promise.all([
    api.listApprovals("pending").catch(() => []),
    api.listNotifications().catch(() => []),
  ]);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-black">
      <Sidebar pendingApprovals={approvals.length} unreadNotifications={unreadCount} />

      <div className="flex flex-1 flex-col pb-14 md:pb-0">
        <header className="flex items-center justify-end gap-2 border-b border-black/[.08] bg-white px-4 py-3 dark:border-white/[.145] dark:bg-zinc-950 md:px-8">
          <NotificationBell notifications={notifications} />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>

      <MobileTabBar pendingApprovals={approvals.length} />
    </div>
  );
}
