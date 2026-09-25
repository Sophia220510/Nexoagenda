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
  const [blockOpen, setBlockOpen] = useState(false);
  const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).format(new Date());
  const slots = useMemo(() => Array.from({ length: SLOT_COUNT }, (_, index) => START_HOUR * 60 + index * SLOT_MINUTES), []);
  const isWorking = (professionalId: string, minutes: number) => workingHours.some((range) => range.professional_id === professionalId && range.weekday === weekday && minutes >= timeToMinutes(range.start_time) && minutes + SLOT_MINUTES <= timeToMinutes(range.end_time));
  const isRecurringBlock = (professionalId: string, minutes: number) => recurringBlocks.some((range) => range.professional_id === professionalId && range.weekday === weekday && minutes < timeToMinutes(range.end_time) && minutes + SLOT_MINUTES > timeToMinutes(range.start_time));
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
          <Link href={dateHref(basePath, today)}>Hoje</Link>
          <Link aria-label="Próximo dia" href={dateHref(basePath, shiftDate(date, 1))}>→</Link>
          <label className="calendar-date-input">Ir para<input type="date" value={date} onChange={(event) => { window.location.href = dateHref(basePath, event.target.value); }} /></label>
          <button type="button" className="button calendar-block-button" onClick={() => setBlockOpen(true)}>＋ Bloquear horário</button>
        </div>
      </div>
      <div className="calendar-subbar"><div className="calendar-legend"><span className="legend-dot booked" /> Agendado <span className="legend-dot blocked" /> Bloqueado <span className="legend-dot off" /> Fora do expediente</div><div className="calendar-summary"><strong>{appointments.filter((item) => item.status !== "CANCELLED").length}</strong> atendimentos <strong>{blockedTimes.length}</strong> bloqueios</div></div>
      <div className="calendar-scroll">
        <div className="time-grid" style={gridStyle}>
          <div className="grid-corner" />
          {professionals.map((professional, index) => <div className="professional-heading" style={{ gridColumn: index + 2, gridRow: 1 }} key={professional.id}><span>{professional.name.slice(0, 1)}</span><strong>{professional.name}</strong></div>)}
          {slots.map((minutes, slotIndex) => <div className={`time-label ${minutes % 60 ? "half-hour" : "full-hour"}`} style={{ gridColumn: 1, gridRow: slotIndex + 2 }} key={minutes}>{String(Math.floor(minutes / 60)).padStart(2, "0")}:{String(minutes % 60).padStart(2, "0")}</div>)}
          {professionals.flatMap((professional, professionalIndex) => slots.map((minutes, slotIndex) => {
            const working = isWorking(professional.id, minutes);
            const recurring = isRecurringBlock(professional.id, minutes);
            return <div
              className={`calendar-slot ${!working ? "off-hours" : ""} ${recurring ? "recurring" : ""}`}
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
            return <Link href={`/painel/agendamentos/${appointment.id}`} className={`calendar-event appointment-event status-${appointment.status.toLowerCase()}`} style={{ gridColumn: column, gridRow: `${row} / span ${span}` }} key={appointment.id}>
              <strong>{shortTime(appointment.starts_at, timezone)} · {appointment.customers?.name}</strong>
              <span>{appointment.services?.name}</span>
              <small>{appointment.customers?.phone}</small>
            </Link>;
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
      <div className="mobile-agenda-timeline">
        {slots.map((minutes) => {
          const slotAppointments = appointments.filter((item) => localMinutes(item.starts_at, timezone) === minutes);
          const slotBlocks = blockedTimes.filter((item) => localMinutes(item.starts_at, timezone) === minutes);
          return <div className="mobile-time-row" key={minutes}><time>{String(Math.floor(minutes / 60)).padStart(2, "0")}:{String(minutes % 60).padStart(2, "0")}</time><div>{slotAppointments.map((item) => <Link href={`/painel/agendamentos/${item.id}`} className={`mobile-event status-${item.status.toLowerCase()}`} key={item.id}><strong>{item.customers?.name}</strong><span>{item.services?.name} · {item.professionals?.name}</span></Link>)}{slotBlocks.map((item) => <article className="mobile-event is-blocked" key={item.id}><strong>Bloqueado</strong><span>{item.reason || "Indisponível"}</span></article>)}{!slotAppointments.length && !slotBlocks.length && <span className="mobile-free">Livre</span>}</div></div>;
        })}
      </div>
      {!appointments.length && !blockedTimes.length && <p className="calendar-empty">Dia livre até agora. Use o botão “Bloquear horário” quando precisar reservar um período.</p>}
    </section>
    {blockOpen && <div className="block-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBlockOpen(false); }}><section className="block-dialog" role="dialog" aria-modal="true" aria-labelledby="block-title">
      <button type="button" className="dialog-close" aria-label="Fechar" onClick={() => setBlockOpen(false)}>×</button>
      <div className="block-dialog-heading"><span>▦</span><div><p className="eyebrow">Nova indisponibilidade</p><h2 id="block-title">Qual horário você quer bloquear?</h2><p>Escolha o dia e informe de que horas até que horas ficará indisponível.</p></div></div>
      <form action={createBlockedTime} className="block-dialog-form">
        {professionals.length === 1 ? <input type="hidden" name="professional_id" value={professionals[0].id} /> : <label className="full-field"><span>Agenda de quem?</span><select name="professional_id" required>{professionals.map((professional) => <option value={professional.id} key={professional.id}>{professional.name}</option>)}</select></label>}
        <label className="full-field"><span>Qual dia?</span><input name="date" type="date" min={today} defaultValue={date < today ? today : date} required /></label>
        <label><span>De que horas?</span><input name="start_time" type="time" step="1800" defaultValue="09:00" required /></label>
        <label><span>Até que horas?</span><input name="end_time" type="time" step="1800" defaultValue="10:00" required /></label>
        <label className="full-field"><span>Motivo <small>(opcional)</small></span><input name="reason" maxLength={500} placeholder="Ex.: almoço, compromisso ou reunião" /></label>
        <div className="block-dialog-tip"><strong>Importante:</strong> horários fora do expediente, durante o almoço ou já ocupados não poderão ser bloqueados novamente.</div>
        <div className="dialog-actions"><button type="button" className="button-ghost" onClick={() => setBlockOpen(false)}>Cancelar</button><SubmitButton pendingText="Bloqueando...">Confirmar bloqueio</SubmitButton></div>
      </form>
    </section></div>}
  </>;
}
