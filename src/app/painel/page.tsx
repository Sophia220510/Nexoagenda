import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const membership = await requireMembership();
  if (membership.role === "PROFESSIONAL") redirect("/painel/minha-agenda");
  const supabase = await createClient();
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const [professionals, services, appointments] = await Promise.all([
    supabase.from("professionals").select("id", { count: "exact", head: true }).eq("business_id", membership.business_id).eq("active", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", membership.business_id).eq("active", true),
    supabase.from("appointments").select("id,starts_at,status,customers(name),services(name),professionals(name)").eq("business_id", membership.business_id).gte("starts_at", today.toISOString().slice(0, 10)).lt("starts_at", tomorrow.toISOString().slice(0, 10)).neq("status", "CANCELLED").order("starts_at").limit(8),
  ]);
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  return <>
    <header className="page-header"><div><p className="eyebrow">Visão geral</p><h1>Olá, vamos organizar o dia.</h1></div><Link className="button" href={`/${membership.businesses?.slug}/agendar`}>Abrir agendamento</Link></header>
    <section className="stat-grid"><article><span>Hoje</span><strong>{appointments.data?.length ?? 0}</strong><small>agendamentos ativos</small></article><article><span>Equipe</span><strong>{professionals.count ?? 0}</strong><small>profissionais ativos</small></article><article><span>Catálogo</span><strong>{services.count ?? 0}</strong><small>serviços ativos</small></article></section>
    <section className="panel-card"><div className="section-title"><h2>Próximos de hoje</h2><Link href="/painel/agenda">Ver agenda</Link></div>
      {!appointments.data?.length ? <p className="empty">Nenhum agendamento para hoje.</p> : <div className="list">{appointments.data.map((item) => <article className="list-row" key={item.id}><div><strong>{formatDateTime(item.starts_at, timezone)}</strong><p>{(item.customers as unknown as { name: string } | null)?.name}</p></div><div className="align-right"><span>{(item.services as unknown as { name: string } | null)?.name}</span><small>{(item.professionals as unknown as { name: string } | null)?.name}</small></div></article>)}</div>}
    </section>
  </>;
}

