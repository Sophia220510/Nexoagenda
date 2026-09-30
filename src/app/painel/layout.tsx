import type { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard-nav";

export const metadata: Metadata = { robots: { index: false, follow: false } };
import {
  getCurrentProfessional,
  getCurrentUser,
  requireMembership,
  requirePasswordChanged,
} from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { getSavedAccounts } from "@/lib/saved-accounts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePasswordChanged();
  const membership = await requireMembership();
  const user = await getCurrentUser();
  const professional =
    membership.role === "PROFESSIONAL" ? await getCurrentProfessional() : null;
  const unreadCount = await getUnreadNotificationCount({
    businessId: membership.business_id,
    professionalId: professional?.id,
  });
  const savedAccounts = await getSavedAccounts();
  return (
    <div className="dashboard-shell">
      <DashboardNav
        membership={membership}
        unreadCount={unreadCount}
        userName={
          user?.user_metadata?.full_name ??
          user?.email?.split("@")[0] ??
          "Usuário"
        }
        savedAccounts={savedAccounts}
        currentUserId={user?.id}
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
