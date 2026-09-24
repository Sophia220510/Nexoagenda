import { AdminNav } from "@/components/admin-nav";
import { requirePlatformAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requirePlatformAdmin();
  return <div className="dashboard-shell admin-shell"><AdminNav /><main className="dashboard-main">{children}</main></div>;
}
