import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, MessageCircle } from "lucide-react";
import { updateCustomerNotes } from "@/app/actions/appointments";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerDetailPage({ params, searchParams }: { params: Promise<{ customerId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const membership = await requireOwner(); const { customerId } = await params; const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("id,name,phone,notes,created_at,appointments(id,starts_at,status,price_cents_snapshot,services(name,price_cents),professionals(name))").eq("id", customerId).eq("business_id", membership.business_id).maybeSingle();
  if (!customer) notFound(); const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo"; const now = new Date();
  const history = (customer.appointments as unknown as Array<{ id: string; starts_at: string; status: string; price_cents_snapshot: number | null; services: { name: string; price_cents: number }; professionals: { name: string } }>).sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at));
  const completed = history.filter((item) => item.status === "COMPLETED"); const next = history.filter((item) => item.status === "CONFIRMED" && new Date(item.starts_at) >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0]; const last = completed[0]; const value = completed.reduce((sum, item) => sum + (item.price_cents_snapshot ?? item.services.price_cents), 0);
  return <><div className="back-row"><Link href="/painel/clientes"><ArrowLeft size={17} /> Voltar para clientes</Link></div><Notice {...await searchParams} /><header className="customer-hero"><span>{customer.name.slice(0, 1)}</span><div><p className="eyebrow">Perfil do cliente</p><h1>{customer.name}</h1><p>{formatPhone(customer.phone)} · cliente desde {formatDateTime(customer.created_at, timezone)}</p></div><div><a className="button-ghost" href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a><Link className="button" href="/painel/agendamentos/novo"><CalendarPlus size={18} /> Agendar</Link></div></header>
    <section className="mini-metrics"><article><span>Atendimentos</span><strong>{completed.length}</strong></article><article><span>Última visita</span><strong>{last ? formatDateTime(last.starts_at, timezone) : "—"}</strong></article><article><span>Próximo horário</span><strong>{next ? formatDateTime(next.starts_at, timezone) : "—"}</strong></article><article><span>Valor histórico</span><strong>{formatCurrency(value)}</strong></article><article><span>Faltas / cancelamentos</span><strong>{history.filter((i) => i.status === "NO_SHOW").length} / {history.filter((i) => i.status === "CANCELLED").length}</strong></article></section>
    <div className="detail-layout"><section className="detail-card"><h2>Histórico</h2>{history.length ? <div className="history-list">{history.map((item) => <Link href={`/painel/agendamentos/${item.id}`} key={item.id}><time>{formatDateTime(item.starts_at, timezone)}</time><span><strong>{item.services.name}</strong><small>{item.professionals.name}</small></span><span className={`status-pill status-${item.status.toLowerCase()}`}>{item.status}</span><b>{formatCurrency(item.price_cents_snapshot ?? item.services.price_cents)}</b></Link>)}</div> : <p className="empty-inline">Nenhum agendamento registrado.</p>}</section><section className="detail-card"><h2>Notas internas</h2><p className="muted">Visíveis somente para o proprietário.</p><form action={updateCustomerNotes} className="form-stack"><input type="hidden" name="customer_id" value={customer.id} /><textarea name="notes" rows={8} defaultValue={customer.notes ?? ""} placeholder="Preferências, restrições ou informações importantes" /><SubmitButton>Salvar notas</SubmitButton></form></section></div>
  </>;
}
