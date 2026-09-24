import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [businesses, activeBusinesses, professionals, members, customers, appointments, todayAppointments, recent] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("professionals").select("id", { count: "exact", head: true }),
    supabase.from("business_members").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }).gte("starts_at", today.toISOString()),
    supabase.from("businesses").select("id,name,slug,active,created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  const stats = [["Empresas", businesses.count], ["Empresas ativas", activeBusinesses.count], ["Profissionais", professionals.count], ["Membros", members.count], ["Clientes", customers.count], ["Agendamentos", appointments.count], ["Desde hoje", todayAppointments.count]];
  return <><header className="page-header"><div><p className="eyebrow">NEXO ADMIN</p><h1>Visão geral da plataforma</h1><p className="muted">Leitura global segura e operações críticas auditadas.</p></div><Link className="button" href="/admin/empresas">Ver empresas</Link></header><section className="stat-grid admin-stats">{stats.map(([label, value]) => <article key={String(label)}><span>{label}</span><strong>{value ?? 0}</strong></article>)}</section><section className="panel-card"><div className="section-title"><h2>Empresas recentes</h2><Link href="/admin/empresas">Ver todas</Link></div><div className="list">{(recent.data ?? []).map((business) => <Link className="list-row" href={`/admin/empresas/${business.id}`} key={business.id}><div><strong>{business.name}</strong><p>/{business.slug}</p></div><div className="align-right"><span className={business.active ? "status-active" : "status-inactive"}>{business.active ? "Ativa" : "Inativa"}</span><small>{formatDateTime(business.created_at, "America/Sao_Paulo")}</small></div></Link>)}</div></section></>;
}
