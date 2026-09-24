import { AgendaList } from "@/components/agenda-list";
import { requireOwner } from "@/lib/auth";
import { getAppointmentsForDate } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";
import { BlockedTimesPanel } from "@/components/blocked-times-panel";
import { Notice } from "@/components/notice";
import { formatInTimeZone } from "date-fns-tz";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string; professional?: string; error?: string }> }) {
  const membership = await requireOwner();
  const query = await searchParams;
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const supabase = await createClient();
  const [pros, blocks] = await Promise.all([
    supabase.from("professionals").select("id,name").eq("business_id", membership.business_id).eq("active", true).order("name"),
    supabase.from("blocked_times").select("id,professional_id,starts_at,ends_at,reason,professionals(name)").eq("business_id", membership.business_id).gte("ends_at", new Date().toISOString()).order("starts_at").limit(30),
  ]);
  const professionalId = (pros.data ?? []).some((professional) => professional.id === query.professional) ? query.professional : undefined;
  const rows = await getAppointmentsForDate(membership.business_id, date, timezone, professionalId);
  const basePath = professionalId ? `/painel/agenda?professional=${professionalId}&date=` : "/painel/agenda";
  return <><header className="page-header"><div><p className="eyebrow">Agenda</p><h1>Agenda da equipe</h1></div><form className="agenda-filter"><input type="hidden" name="date" value={date} /><select name="professional" defaultValue={professionalId ?? ""}><option value="">Todos os profissionais</option>{(pros.data ?? []).map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select><button className="button-ghost">Filtrar</button></form></header><Notice error={query.error} /><AgendaList rows={rows} timezone={timezone} date={date} basePath={basePath} /><BlockedTimesPanel professionals={pros.data ?? []} blockedTimes={(blocks.data ?? []) as unknown as Parameters<typeof BlockedTimesPanel>[0]["blockedTimes"]} timezone={timezone} /></>;
}
