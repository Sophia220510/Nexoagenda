import { requireOwner } from "@/lib/auth";
import { getAppointmentsForDate } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";
import { BlockedTimesPanel } from "@/components/blocked-times-panel";
import { VisualAgenda } from "@/components/visual-agenda";
import { Notice } from "@/components/notice";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { WeeklyAgenda } from "@/components/weekly-agenda";
import { startOfWeek } from "date-fns";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ date?: string; professional?: string; view?: string; error?: string }> }) {
  const membership = await requireOwner();
  const query = await searchParams;
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const view = query.view === "week" ? "week" : "day";
  const supabase = await createClient();
  const dayStart = fromZonedTime(`${date} 00:00:00`, timezone);
  const dayEnd = addDays(dayStart, 1);
  const [pros, upcomingBlocks] = await Promise.all([
    supabase.from("professionals").select("id,name").eq("business_id", membership.business_id).eq("active", true).order("name"),
    supabase.from("blocked_times").select("id,professional_id,starts_at,ends_at,reason,professionals(name)").eq("business_id", membership.business_id).gte("ends_at", new Date().toISOString()).order("starts_at").limit(30),
  ]);
  const ownProfessional = await supabase.from("professionals").select("id,name").eq("business_id", membership.business_id).eq("user_id", membership.user_id).eq("active", true).maybeSingle();
  const professionalId = query.professional === "all"
    ? undefined
    : (pros.data ?? []).some((professional) => professional.id === query.professional)
      ? query.professional
      : ownProfessional.data?.id;
  const visibleProfessionals = professionalId ? (pros.data ?? []).filter((professional) => professional.id === professionalId) : (pros.data ?? []);
  const [rows, dayBlocks, workingHours, recurringBlocks] = await Promise.all([
    getAppointmentsForDate(membership.business_id, date, timezone, professionalId),
    supabase.from("blocked_times").select("id,professional_id,starts_at,ends_at,reason").eq("business_id", membership.business_id).lt("starts_at", dayEnd.toISOString()).gt("ends_at", dayStart.toISOString()).order("starts_at"),
    supabase.from("working_hours").select("professional_id,weekday,start_time,end_time").eq("business_id", membership.business_id).eq("active", true),
    supabase.from("recurring_blocks").select("professional_id,weekday,start_time,end_time").eq("business_id", membership.business_id).eq("active", true),
  ]);
  const weekDate = formatInTimeZone(startOfWeek(new Date(`${date}T12:00:00Z`), { weekStartsOn: 1 }), "UTC", "yyyy-MM-dd");
  const weekStart = fromZonedTime(`${weekDate} 00:00:00`, timezone); const weekEnd = addDays(weekStart, 7);
  let weekAppointmentsQuery = supabase.from("appointments").select("id,professional_id,starts_at,status,customers(name),services(name),professionals(name)").eq("business_id", membership.business_id).gte("starts_at", weekStart.toISOString()).lt("starts_at", weekEnd.toISOString()).neq("status", "CANCELLED").order("starts_at");
  let weekBlocksQuery = supabase.from("blocked_times").select("id,professional_id,starts_at,reason,professionals(name)").eq("business_id", membership.business_id).gte("starts_at", weekStart.toISOString()).lt("starts_at", weekEnd.toISOString()).order("starts_at");
  if (professionalId) { weekAppointmentsQuery = weekAppointmentsQuery.eq("professional_id", professionalId); weekBlocksQuery = weekBlocksQuery.eq("professional_id", professionalId); }
  const [weekAppointments, weekBlocks] = view === "week" ? await Promise.all([weekAppointmentsQuery, weekBlocksQuery]) : [{ data: [] }, { data: [] }];
  const filterValue = professionalId ?? "all"; const viewBase = `/painel/agenda?professional=${filterValue}&view=${view}&date=`;
  return <><header className="page-header premium"><div><p className="eyebrow">Agenda</p><h1>{professionalId === ownProfessional.data?.id ? "Minha agenda" : "Agenda da equipe"}</h1><p className="muted">Acompanhe os atendimentos e bloqueie períodos quando precisar.</p></div><div className="header-actions"><form className="agenda-filter"><input type="hidden" name="date" value={date} /><input type="hidden" name="view" value={view} /><select name="professional" defaultValue={filterValue}>{ownProfessional.data && <option value={ownProfessional.data.id}>Minha agenda</option>}<option value="all">Equipe completa</option>{(pros.data ?? []).filter((professional) => professional.id !== ownProfessional.data?.id).map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select><button className="button-ghost">Visualizar</button></form><Link className="button" href="/painel/agendamentos/novo"><CalendarPlus size={18} /> Novo agendamento</Link></div></header><div className="view-tabs"><Link className={view === "day" ? "active" : ""} href={`/painel/agenda?professional=${filterValue}&view=day&date=${date}`}>Dia</Link><Link className={view === "week" ? "active" : ""} href={`/painel/agenda?professional=${filterValue}&view=week&date=${date}`}>Semana</Link></div><Notice error={query.error} />{view === "day" ? <VisualAgenda appointments={rows} blockedTimes={dayBlocks.data ?? []} professionals={visibleProfessionals} workingHours={workingHours.data ?? []} recurringBlocks={recurringBlocks.data ?? []} timezone={timezone} date={date} basePath={viewBase} /> : <WeeklyAgenda startDate={weekDate} timezone={timezone} appointments={(weekAppointments.data ?? []) as unknown as Parameters<typeof WeeklyAgenda>[0]["appointments"]} blocks={(weekBlocks.data ?? []) as unknown as Parameters<typeof WeeklyAgenda>[0]["blocks"]} baseHref={`/painel/agenda?professional=${filterValue}&view=week&date=`} />}<BlockedTimesPanel professionals={pros.data ?? []} blockedTimes={(upcomingBlocks.data ?? []) as unknown as Parameters<typeof BlockedTimesPanel>[0]["blockedTimes"]} timezone={timezone} /></>;
}
