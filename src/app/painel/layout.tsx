import { DashboardNav } from "@/components/dashboard-nav";
import { requireMembership } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const membership = await requireMembership();
  return <div className="dashboard-shell"><DashboardNav membership={membership} /><main className="dashboard-main">{children}</main></div>;
}

