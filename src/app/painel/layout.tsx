import { DashboardNav } from "@/components/dashboard-nav";
import { requireMembership, requirePasswordChanged } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePasswordChanged(); const membership = await requireMembership();
  return <div className="dashboard-shell"><DashboardNav membership={membership} /><main className="dashboard-main">{children}</main></div>;
}
