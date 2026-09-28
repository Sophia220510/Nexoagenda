import { AdminNav } from "@/components/admin-nav";
import {
  getCurrentUser,
  requirePasswordChanged,
  requirePlatformAdmin,
} from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSavedAccounts } from "@/lib/saved-accounts";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePasswordChanged();
  await requirePlatformAdmin();
  const [unreadCount, savedAccounts, user] = await Promise.all([
    getUnreadNotificationCount(),
    getSavedAccounts(),
    getCurrentUser(),
  ]);
  return (
    <div className="dashboard-shell admin-shell">
      <AdminNav
        unreadCount={unreadCount}
        savedAccounts={savedAccounts}
        currentUserId={user?.id}
        userName={
          user?.user_metadata?.full_name ??
          user?.email?.split("@")[0] ??
          "Master Admin"
        }
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
