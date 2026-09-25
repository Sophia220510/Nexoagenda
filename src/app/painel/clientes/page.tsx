import Link from "next/link";
import { ChevronRight, ContactRound, Search } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

type Visit = { starts_at: string; status: string; price_cents_snapshot: number | null; services: { price_cents: number } | null };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const membership = await requireOwner(); const params = await searchParams; const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id,name,phone,created_at,appointments(starts_at,status,price_cents_snapshot,services(price_cents))").eq("business_id", membership.business_id).order("name");
  const now = new Date(); const q = (params.q ?? "").trim().toLocaleLowerCase("pt-BR"); const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const customers = (data ?? []).map((customer) => { const visits = customer.appointments as unknown as Visit[]; const valid = visits.filter((item) => item.status !== "CANCELLED"); const past = valid.filter((item) => new Date(item.starts_at) < now).sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at)); const next = valid.filter((item) => new Date(item.starts_at) >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0]; return { ...customer, visits, past, next, value: valid.reduce((sum, item) => sum + (item.price_cents_snapshot ?? item.services?.price_cents ?? 0), 0) }; }).filter((customer) => !q || customer.name.toLocaleLowerCase("pt-BR").includes(q) || customer.phone.includes(q.replace(/\D/g, "")));
  customers.sort((a, b) => params.sort === "recent" ? +(b.past[0] ? new Date(b.past[0].starts_at) : 0) - +(a.past[0] ? new Date(a.past[0].starts_at) : 0) : params.sort === "visits" ? b.past.length - a.past.length : a.name.localeCompare(b.name, "pt-BR"));
  return <><header className="page-header premium"><div><p className="eyebrow">Relacionamento</p><h1>Clientes</h1><p className="muted">Histórico, recorrência e próximos atendimentos em um só lugar.</p></div><Link className="button" href="/painel/agendamentos/novo">Novo agendamento</Link></header>
    <form className="list-toolbar"><label><Search size={17} /><input name="q" defaultValue={params.q} placeholder="Buscar nome ou telefone" /></label><select name="sort" defaultValue={params.sort ?? "name"}><option value="name">Nome A–Z</option><option value="recent">Visita mais recente</option><option value="visits">Mais atendimentos</option></select><button className="button-ghost">Aplicar</button></form>
    <section className="data-card">{customers.length ? <div className="customer-table"><div className="table-head"><span>Cliente</span><span>Última visita</span><span>Próximo horário</span><span>Atendimentos</span><span>Valor histórico</span><span /></div>{customers.map((customer) => <Link href={`/painel/clientes/${customer.id}`} className="table-row" key={customer.id}><span className="customer-cell"><b>{customer.name.slice(0, 1)}</b><span><strong>{customer.name}</strong><small>{formatPhone(customer.phone)}</small></span></span><span>{customer.past[0] ? formatDateTime(customer.past[0].starts_at, timezone) : "Ainda não atendido"}</span><span>{customer.next ? formatDateTime(customer.next.starts_at, timezone) : "Sem agendamento"}</span><span>{customer.past.filter((v) => v.status === "COMPLETED").length}</span><span>{formatCurrency(customer.value)}</span><ChevronRight size={18} /></Link>)}</div> : <div className="empty-state"><ContactRound /><h2>Ainda não há clientes</h2><p>Eles aparecerão automaticamente após o primeiro agendamento.</p><Link href="/painel/agendamentos/novo" className="button">Novo agendamento</Link></div>}</section>
  </>;
}
