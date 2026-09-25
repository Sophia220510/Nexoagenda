"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createBlockedTime } from "@/app/actions/business";
import { SubmitButton } from "@/components/submit-button";

type Professional = { id: string; name: string };
type Appointment = {
  id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customers: { name: string; phone: string } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
};
type BlockedTime = { id: string; professional_id: string; starts_at: string; ends_at: string; reason: string | null };
type WeeklyRange = { professional_id: string; weekday: number; start_time: string; end_time: string };

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

function dateHref(basePath: string, date: string) {
  return basePath.includes("date=") ? `${basePath}${date}` : `${basePath}?date=${date}`;
}

function shiftDate(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function localMinutes(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function shortTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(value));
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function toDateTimeLocal(date: string, minutes: number) {
  const hour = Math.floor(minutes / 60).toString().padStart(2, "0");
  const minute = (minutes % 60).toString().padStart(2, "0");
  return `${date}T${hour}:${minute}`;
}

export function VisualAgenda({ appointments, blockedTimes, professionals, workingHours, recurringBlocks, timezone, date, basePath }: {
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  professionals: Professional[];
  workingHours: WeeklyRange[];
  recurringBlocks: WeeklyRange[];
  timezone: string;
  date: string;
  basePath: string;
}) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const [selection, setSelection] = useState<{ professionalId: string; start: number; end: number } | null>(null);
  const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const slots = useMemo(() => Array.from({ length: SLOT_COUNT }, (_, index) => START_HOUR * 60 + index * SLOT_MINUTES), []);
  const isWorking = (professionalId: string, minutes: number) => workingHours.some((range) => range.professional_id === professionalId && range.weekday === weekday && minutes >= timeToMinutes(range.start_time) && minutes + SLOT_MINUTES <= timeToMinutes(range.end_time));
  const isRecurringBlock = (professionalId: string, minutes: number) => recurringBlocks.some((range) => range.professional_id === professionalId && range.weekday === weekday && minutes < timeToMinutes(range.end_time) && minutes + SLOT_MINUTES > timeToMinutes(range.start_time));
  const hasEvent = (professionalId: string, minutes: number) => [
    ...appointments.filter((appointment) => appointment.status !== "CANCELLED"),
    ...blockedTimes,
  ].some((event) => event.professional_id === professionalId && minutes < localMinutes(event.ends_at, timezone) && minutes + SLOT_MINUTES > localMinutes(event.starts_at, timezone));
  const selectSlot = (professionalId: string, minutes: number) => {
    if (!isWorking(professionalId, minutes) || isRecurringBlock(professionalId, minutes) || hasEvent(professionalId, minutes)) return;
    setSelection({ professionalId, start: minutes, end: minutes + SLOT_MINUTES });
  };
  const gridStyle = { gridTemplateColumns: `72px repeat(${Math.max(professionals.length, 1)}, minmax(150px, 1fr))`, gridTemplateRows: `52px repeat(${SLOT_COUNT}, 34px)` };

  return <>
    <section className="calendar-card">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow">Visão do dia</p>
          <h2>{dayLabel}</h2>
        </div>
        <div className="date-nav">
          <Link aria-label="Dia anterior" href={dateHref(basePath, shiftDate(date, -1))}>←</Link>
          <Link href={basePath.split("?")[0]}>Hoje</Link>
          <Link aria-label="Próximo dia" href={dateHref(basePath, shiftDate(date, 1))}>→</Link>
          <label className="calendar-date-input">Ir para<input type="date" value={date} onChange={(event) => { window.location.href = dateHref(basePath, event.target.value); }} /></label>
        </div>
      </div>
      <div className="calendar-legend"><span className="legend-dot booked" /> Agendado <span className="legend-dot blocked" /> Bloqueado <span className="legend-dot off" /> Fora do expediente</div>
      <div className="calendar-scroll">
        <div className="time-grid" style={gridStyle}>
          <div className="grid-corner" />
          {professionals.map((professional, index) => <div className="professional-heading" style={{ gridColumn: index + 2, gridRow: 1 }} key={professional.id}><span>{professional.name.slice(0, 1)}</span><strong>{professional.name}</strong></div>)}
          {slots.map((minutes, slotIndex) => <div className="time-label" style={{ gridColumn: 1, gridRow: slotIndex + 2 }} key={minutes}>{minutes % 60 === 0 ? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00` : ""}</div>)}
          {professionals.flatMap((professional, professionalIndex) => slots.map((minutes, slotIndex) => {
            const working = isWorking(professional.id, minutes);
            const recurring = isRecurringBlock(professional.id, minutes);
            const occupied = hasEvent(professional.id, minutes);
            return <button
              type="button"
              aria-label={`${professional.name}, ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`}
              className={`calendar-slot ${!working ? "off-hours" : ""} ${recurring ? "recurring" : ""}`}
              disabled={!working || recurring || occupied}
              onClick={() => selectSlot(professional.id, minutes)}
              style={{ gridColumn: professionalIndex + 2, gridRow: slotIndex + 2 }}
              key={`${professional.id}-${minutes}`}
            />;
          }))}
          {appointments.map((appointment) => {
            const column = professionals.findIndex((professional) => professional.id === appointment.professional_id) + 2;
            if (column < 2) return null;
            const start = localMinutes(appointment.starts_at, timezone);
            const end = localMinutes(appointment.ends_at, timezone);
            const row = 2 + Math.max(0, Math.floor((start - START_HOUR * 60) / SLOT_MINUTES));
            const span = Math.max(1, Math.ceil((end - Math.max(start, START_HOUR * 60)) / SLOT_MINUTES));
            return <article className={`calendar-event appointment-event status-${appointment.status.toLowerCase()}`} style={{ gridColumn: column, gridRow: `${row} / span ${span}` }} key={appointment.id}>
              <strong>{shortTime(appointment.starts_at, timezone)} · {appointment.customers?.name}</strong>
              <span>{appointment.services?.name}</span>
              <small>{appointment.customers?.phone}</small>
            </article>;
          })}
          {blockedTimes.map((blocked) => {
            const column = professionals.findIndex((professional) => professional.id === blocked.professional_id) + 2;
            if (column < 2) return null;
            const start = localMinutes(blocked.starts_at, timezone);
            const end = localMinutes(blocked.ends_at, timezone);
            const row = 2 + Math.max(0, Math.floor((start - START_HOUR * 60) / SLOT_MINUTES));
            const span = Math.max(1, Math.ceil((end - Math.max(start, START_HOUR * 60)) / SLOT_MINUTES));
            return <article className="calendar-event blocked-event" style={{ gridColumn: column, gridRow: `${row} / span ${span}` }} key={blocked.id}>
              <strong>{shortTime(blocked.starts_at, timezone)} · Bloqueado</strong>
              <span>{blocked.reason || "Indisponível"}</span>
            </article>;
          })}
        </div>
      </div>
      {!appointments.length && !blockedTimes.length && <p className="calendar-empty">Nenhum agendamento neste dia. Clique em um horário livre para criar um bloqueio.</p>}
    </section>

    {selection && <section className="quick-block-card" aria-live="polite">
      <div><p className="eyebrow">Bloqueio rápido</p><h3>{professionals.find((professional) => professional.id === selection.professionalId)?.name}</h3><p>{date.split("-").reverse().join("/")} · {toDateTimeLocal(date, selection.start).slice(-5)} às {toDateTimeLocal(date, selection.end).slice(-5)}</p></div>
      <form action={createBlockedTime} className="quick-block-form">
        <input type="hidden" name="professional_id" value={selection.professionalId} />
        <input type="hidden" name="starts_at" value={toDateTimeLocal(date, selection.start)} />
        <label>Duração<select value={selection.end - selection.start} onChange={(event) => setSelection({ ...selection, end: selection.start + Number(event.target.value) })}><option value="30">30 min</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option><option value="240">Meio período</option></select></label>
        <input type="hidden" name="ends_at" value={toDateTimeLocal(date, selection.end)} />
        <label>Motivo<input name="reason" maxLength={500} placeholder="Ex.: compromisso pessoal" /></label>
        <div className="card-actions"><button type="button" className="button-ghost" onClick={() => setSelection(null)}>Cancelar</button><SubmitButton>Bloquear horário</SubmitButton></div>
      </form>
    </section>}
  </>;
}
