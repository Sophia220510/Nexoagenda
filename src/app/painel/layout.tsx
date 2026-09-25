import { DashboardNav } from "@/components/dashboard-nav";
import { getCurrentProfessional, getCurrentUser, requireMembership, requirePasswordChanged } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePasswordChanged(); const membership = await requireMembership();
  const user = await getCurrentUser();
  const professional = membership.role === "PROFESSIONAL" ? await getCurrentProfessional() : null;
  const unreadCount = await getUnreadNotificationCount({ businessId: membership.business_id, professionalId: professional?.id });
  return <div className="dashboard-shell"><DashboardNav membership={membership} unreadCount={unreadCount} userName={user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Usuário"} /><main className="dashboard-main">{children}</main></div>;
}
