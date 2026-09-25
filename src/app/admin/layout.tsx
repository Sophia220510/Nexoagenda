import { AdminNav } from "@/components/admin-nav";
import { requirePasswordChanged, requirePlatformAdmin } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requirePasswordChanged(); await requirePlatformAdmin();
  const unreadCount = await getUnreadNotificationCount();
  return <div className="dashboard-shell admin-shell"><AdminNav unreadCount={unreadCount} /><main className="dashboard-main">{children}</main></div>;
}
