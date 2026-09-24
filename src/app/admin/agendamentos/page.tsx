import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function AdminAppointmentsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("appointments").select("id,starts_at,status,businesses(name,timezone),customers(name),services(name),professionals(name)").order("starts_at", { ascending: false }).limit(250);
  return <><header className="page-header"><div><p className="eyebrow">Plataforma</p><h1>Agendamentos</h1><p className="muted">Os 250 registros mais recentes.</p></div></header><section className="panel-card"><div className="list">{(data ?? []).map((appointment) => { const business = appointment.businesses as unknown as { name: string; timezone: string } | null; return <article className="list-row" key={appointment.id}><div><strong>{formatDateTime(appointment.starts_at, business?.timezone ?? "America/Sao_Paulo")}</strong><p>{(appointment.customers as unknown as { name: string } | null)?.name} · {(appointment.services as unknown as { name: string } | null)?.name}</p></div><div className="align-right"><span>{business?.name}</span><small>{(appointment.professionals as unknown as { name: string } | null)?.name} · {appointment.status}</small></div></article>; })}</div></section></>;
}
