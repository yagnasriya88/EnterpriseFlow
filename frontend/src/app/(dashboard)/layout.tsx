import { LogOut } from "lucide-react";
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
    <div className="flex min-h-screen w-full bg-neutral-50">
      <Sidebar pendingApprovals={approvals.length} unreadNotifications={unreadCount} />

      <div className="flex flex-1 flex-col pb-14 md:pb-0">
        <header className="flex items-center justify-end gap-2 border-b border-neutral-200 bg-white px-4 py-3 md:px-8">
          <NotificationBell notifications={notifications} />
          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-sm font-medium text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
            >
              <LogOut className="size-4" aria-hidden="true" />
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
