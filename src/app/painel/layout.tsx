import { DashboardNav } from "@/components/dashboard-nav";
import { getCurrentProfessional, requireMembership, requirePasswordChanged } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePasswordChanged(); const membership = await requireMembership();
  const professional = membership.role === "PROFESSIONAL" ? await getCurrentProfessional() : null;
  const unreadCount = await getUnreadNotificationCount({ businessId: membership.business_id, professionalId: professional?.id });
  return <div className="dashboard-shell"><DashboardNav membership={membership} unreadCount={unreadCount} /><main className="dashboard-main">{children}</main></div>;
}
