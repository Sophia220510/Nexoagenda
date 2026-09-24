import { AgendaList } from "@/components/agenda-list";
import { requireProfessional } from "@/lib/auth";
import { getAppointmentsForDate } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";
import { BlockedTimesPanel } from "@/components/blocked-times-panel";
import { Notice } from "@/components/notice";
import { formatInTimeZone } from "date-fns-tz";

export default async function MyAgendaPage({ searchParams }: { searchParams: Promise<{ date?: string; error?: string }> }) {
  const membership = await requireProfessional();
  const query = await searchParams;
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const rows = await getAppointmentsForDate(membership.business_id, date, timezone);
  const supabase = await createClient();
  const { data: professional } = await supabase.from("professionals").select("id,name").eq("business_id", membership.business_id).limit(1).maybeSingle();
  const { data: blocks } = professional ? await supabase.from("blocked_times").select("id,professional_id,starts_at,ends_at,reason,professionals(name)").eq("professional_id", professional.id).gte("ends_at", new Date().toISOString()).order("starts_at").limit(30) : { data: [] };
  return <><header className="page-header"><div><p className="eyebrow">Área profissional</p><h1>Minha agenda</h1></div></header><Notice error={query.error} /><AgendaList rows={rows} timezone={timezone} date={date} basePath="/painel/minha-agenda" /><BlockedTimesPanel professionals={professional ? [professional] : []} blockedTimes={(blocks ?? []) as unknown as Parameters<typeof BlockedTimesPanel>[0]["blockedTimes"]} timezone={timezone} /></>;
}
