import Link from "next/link";
import { CalendarPlus, ChevronRight, Search } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/types/domain";

const labels: Record<string, string> = { CONFIRMED: "Confirmado", COMPLETED: "Concluído", CANCELLED: "Cancelado", NO_SHOW: "Não compareceu" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const membership = await requireOwner(); const params = await searchParams; const supabase = await createClient();
  let query = supabase.from("appointments").select("id,starts_at,status,price_cents_snapshot,customers(name,phone),services(name,price_cents),professionals(name)").eq("business_id", membership.business_id).order("starts_at", { ascending: false }).limit(100);
  if (["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(params.status ?? "")) query = query.eq("status", params.status as AppointmentStatus);
  const { data } = await query;
  const q = (params.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const rows = (data ?? []).filter((item) => !q || (item.customers as unknown as { name: string })?.name.toLocaleLowerCase("pt-BR").includes(q) || (item.services as unknown as { name: string })?.name.toLocaleLowerCase("pt-BR").includes(q));
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  return <><header className="page-header premium"><div><p className="eyebrow">Operação</p><h1>Agendamentos</h1><p className="muted">Consulte, atualize e acompanhe todos os atendimentos.</p></div><Link className="button" href="/painel/agendamentos/novo"><CalendarPlus size={18} /> Novo agendamento</Link></header>
    <form className="list-toolbar"><label><Search size={17} /><input name="q" defaultValue={params.q} placeholder="Buscar cliente ou serviço" /></label><select name="status" defaultValue={params.status ?? ""}><option value="">Todos os status</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="button-ghost">Filtrar</button></form>
    <section className="data-card">{rows.length ? <div className="appointment-list">{rows.map((item) => { const customer = item.customers as unknown as { name: string; phone: string }; const service = item.services as unknown as { name: string; price_cents: number }; const professional = item.professionals as unknown as { name: string }; return <Link href={`/painel/agendamentos/${item.id}`} className="appointment-row" key={item.id}><time>{formatDateTime(item.starts_at, timezone)}</time><div><strong>{customer?.name}</strong><small>{service?.name} · {professional?.name}</small></div><span className={`status-pill status-${item.status.toLowerCase()}`}>{labels[item.status]}</span><b>{formatCurrency(item.price_cents_snapshot ?? service?.price_cents ?? 0)}</b><ChevronRight size={18} /></Link>; })}</div> : <div className="empty-state"><CalendarPlus /><h2>Nenhum agendamento encontrado</h2><p>Altere os filtros ou crie um novo atendimento.</p><Link className="button" href="/painel/agendamentos/novo">Criar agendamento</Link></div>}</section>
  </>;
}
