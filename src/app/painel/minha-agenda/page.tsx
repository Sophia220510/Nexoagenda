import { requireConfiguredProfessional } from "@/lib/auth";
import { getAppointmentsForDate } from "@/lib/appointments";
import { createClient } from "@/lib/supabase/server";
import { BlockedTimesPanel } from "@/components/blocked-times-panel";
import { VisualAgenda } from "@/components/visual-agenda";
import { Notice } from "@/components/notice";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";

export default async function MyAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const { membership, professional: currentProfessional } =
    await requireConfiguredProfessional();
  const query = await searchParams;
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "")
    ? query.date!
    : formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const dayStart = fromZonedTime(`${date} 00:00:00`, timezone);
  const dayEnd = addDays(dayStart, 1);
  const rows = await getAppointmentsForDate(
    membership.business_id,
    date,
    timezone,
    currentProfessional.id,
  );
  const supabase = await createClient();
  const { data: professional } = await supabase
    .from("professionals")
    .select("id,name")
    .eq("id", currentProfessional.id)
    .maybeSingle();
  const [dayBlocks, upcomingBlocks, workingHours, recurringBlocks] =
    professional
      ? await Promise.all([
          supabase
            .from("blocked_times")
            .select("id,professional_id,starts_at,ends_at,reason")
            .eq("professional_id", professional.id)
            .lt("starts_at", dayEnd.toISOString())
            .gt("ends_at", dayStart.toISOString())
            .order("starts_at"),
          supabase
            .from("blocked_times")
            .select(
              "id,professional_id,starts_at,ends_at,reason,professionals(name)",
            )
            .eq("professional_id", professional.id)
            .gte("ends_at", new Date().toISOString())
            .order("starts_at")
            .limit(30),
          supabase
            .from("working_hours")
            .select("professional_id,weekday,start_time,end_time")
            .eq("professional_id", professional.id)
            .eq("active", true),
          supabase
            .from("recurring_blocks")
            .select("professional_id,weekday,start_time,end_time")
            .eq("professional_id", professional.id)
            .eq("active", true),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Área profissional</p>
          <h1>Minha agenda</h1>
          <p className="muted">
            Veja os horários do dia e clique em um espaço livre para bloquear.
          </p>
        </div>
      </header>
      <Notice error={query.error} />
      {professional && (
        <VisualAgenda
          appointments={rows}
          blockedTimes={dayBlocks.data ?? []}
          professionals={[professional]}
          workingHours={workingHours.data ?? []}
          recurringBlocks={recurringBlocks.data ?? []}
          timezone={timezone}
          date={date}
          basePath="/painel/minha-agenda"
          nowIso={new Date().toISOString()}
        />
      )}
      <BlockedTimesPanel
        professionals={professional ? [professional] : []}
        blockedTimes={
          (upcomingBlocks.data ?? []) as unknown as Parameters<
            typeof BlockedTimesPanel
          >[0]["blockedTimes"]
        }
        timezone={timezone}
      />
    </>
  );
}
