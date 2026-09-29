"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LockKeyhole,
  UsersRound,
} from "lucide-react";
import { createBlockedTime } from "@/app/actions/business";
import { SubmitButton } from "@/components/submit-button";
import { intervalOverlapsSlot } from "@/lib/agenda-grid";

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
type BlockedTime = {
  id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};
type WeeklyRange = {
  professional_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

const DEFAULT_START_MINUTES = 7 * 60;
const DEFAULT_END_MINUTES = 21 * 60;

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

function dateHref(basePath: string, date: string) {
  return basePath.includes("date=")
    ? `${basePath}${date}`
    : `${basePath}?date=${date}`;
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
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

function shortTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function VisualAgenda({
  appointments,
  blockedTimes,
  professionals,
  workingHours,
  recurringBlocks,
  timezone,
  date,
  basePath,
  nowIso,
  slotMinutes = 15,
  canCreateAppointment = false,
}: {
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
  professionals: Professional[];
  workingHours: WeeklyRange[];
  recurringBlocks: WeeklyRange[];
  timezone: string;
  date: string;
  basePath: string;
  nowIso: string;
  slotMinutes?: number;
  canCreateAppointment?: boolean;
}) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const [blockOpen, setBlockOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    professionalId: string;
    professionalName: string;
    minutes: number;
  } | null>(null);
  const [slotActionsOpen, setSlotActionsOpen] = useState(false);
  const dayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  const today = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date(nowIso));
  const nowMinutes = localMinutes(nowIso, timezone);
  const dayWorkingHours = workingHours.filter(
    (range) =>
      range.weekday === weekday &&
      professionals.some((professional) => professional.id === range.professional_id),
  );
  const startMinutes = dayWorkingHours.length
    ? Math.min(...dayWorkingHours.map((range) => timeToMinutes(range.start_time)))
    : DEFAULT_START_MINUTES;
  const endMinutes = dayWorkingHours.length
    ? Math.max(...dayWorkingHours.map((range) => timeToMinutes(range.end_time)))
    : DEFAULT_END_MINUTES;
  const slotCount = Math.max(1, Math.ceil((endMinutes - startMinutes) / slotMinutes));
  const rowHeight = slotMinutes <= 15 ? 34 : 46;
  const showNow =
    date === today &&
    nowMinutes >= startMinutes &&
    nowMinutes <= endMinutes;
  const slots = useMemo(
    () =>
      Array.from(
        { length: slotCount },
        (_, index) => startMinutes + index * slotMinutes,
      ),
    [slotCount, slotMinutes, startMinutes],
  );
  const isWorking = (professionalId: string, minutes: number) =>
    workingHours.some(
      (range) =>
        range.professional_id === professionalId &&
        range.weekday === weekday &&
        minutes >= timeToMinutes(range.start_time) &&
        minutes + slotMinutes <= timeToMinutes(range.end_time),
    );
  const isRecurringBlock = (professionalId: string, minutes: number) =>
    recurringBlocks.some(
      (range) =>
        range.professional_id === professionalId &&
        range.weekday === weekday &&
        minutes < timeToMinutes(range.end_time) &&
        minutes + slotMinutes > timeToMinutes(range.start_time),
    );
  const gridStyle = {
    gridTemplateColumns: `78px repeat(${Math.max(professionals.length, 1)}, minmax(190px, 1fr))`,
    gridTemplateRows: `58px repeat(${slotCount}, ${rowHeight}px)`,
  };
  const activeAppointments = appointments.filter(
    (item) => item.status !== "CANCELLED",
  );
  const confirmedAppointments = activeAppointments.filter(
    (item) => item.status === "CONFIRMED",
  ).length;
  const openFreeSlot = (professional: Professional, minutes: number) => {
    setSelectedSlot({
      professionalId: professional.id,
      professionalName: professional.name,
      minutes,
    });
    if (canCreateAppointment) setSlotActionsOpen(true);
    else setBlockOpen(true);
  };
  const appointmentAt = (professionalId: string, minutes: number) =>
    activeAppointments.find(
      (appointment) =>
        appointment.professional_id === professionalId &&
        intervalOverlapsSlot(
          localMinutes(appointment.starts_at, timezone),
          localMinutes(appointment.ends_at, timezone),
          minutes,
          slotMinutes,
        ),
    );
  const blockedAt = (professionalId: string, minutes: number) =>
    blockedTimes.find(
      (blocked) =>
        blocked.professional_id === professionalId &&
        intervalOverlapsSlot(
          localMinutes(blocked.starts_at, timezone),
          localMinutes(blocked.ends_at, timezone),
          minutes,
          slotMinutes,
        ),
    );

  return (
    <>
      <section className="calendar-card">
        <div className="calendar-toolbar">
          <div className="agenda-date-display">
            <span className="agenda-date-icon">
              <CalendarDays size={20} />
            </span>
            <div>
              <p className="eyebrow">Visão do dia</p>
              <h2>{dayLabel}</h2>
            </div>
          </div>
          <div className="date-nav">
            <Link
              aria-label="Dia anterior"
              href={dateHref(basePath, shiftDate(date, -1))}
            >
              <ChevronLeft size={18} />
            </Link>
            <Link href={dateHref(basePath, today)}>Hoje</Link>
            <Link
              aria-label="Próximo dia"
              href={dateHref(basePath, shiftDate(date, 1))}
            >
              <ChevronRight size={18} />
            </Link>
            <label className="calendar-date-input">
              Ir para
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  window.location.href = dateHref(basePath, event.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="button calendar-block-button"
              onClick={() => {
                setSelectedSlot(null);
                setBlockOpen(true);
              }}
            >
              <LockKeyhole size={17} /> Bloquear horário
            </button>
          </div>
        </div>
        <div className="agenda-day-overview">
          <article>
            <span>
              <CalendarDays size={17} />
            </span>
            <div>
              <strong>{activeAppointments.length}</strong>
              <small>atendimentos</small>
            </div>
          </article>
          <article>
            <span>
              <Clock3 size={17} />
            </span>
            <div>
              <strong>{confirmedAppointments}</strong>
              <small>confirmados</small>
            </div>
          </article>
          <article>
            <span>
              <LockKeyhole size={17} />
            </span>
            <div>
              <strong>{blockedTimes.length}</strong>
              <small>bloqueios</small>
            </div>
          </article>
          <article>
            <span>
              <UsersRound size={17} />
            </span>
            <div>
              <strong>{professionals.length}</strong>
              <small>
                {professionals.length === 1 ? "profissional" : "profissionais"}
              </small>
            </div>
          </article>
        </div>
        <div className="calendar-subbar">
          <div className="calendar-legend">
            <span className="legend-dot booked" /> Agendado{" "}
            <span className="legend-dot blocked" /> Bloqueado{" "}
            <span className="legend-dot off" /> Fora do expediente
          </div>
          <span className="agenda-resolution">Intervalos de {slotMinutes} minutos</span>
        </div>
        <div className="calendar-scroll">
          <div className="time-grid" style={gridStyle}>
            <div className="grid-corner" />
            {professionals.map((professional, index) => (
              <div
                className="professional-heading"
                style={{ gridColumn: index + 2, gridRow: 1 }}
                key={professional.id}
              >
                <span>{professional.name.slice(0, 1)}</span>
                <div>
                  <strong>{professional.name}</strong>
                  <small>Agenda do dia</small>
                </div>
              </div>
            ))}
            {slots.map((minutes, slotIndex) => (
              <div
                className={`time-label ${minutes % 60 ? "half-hour" : "full-hour"}`}
                style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
                key={minutes}
              >
                {String(Math.floor(minutes / 60)).padStart(2, "0")}:
                {String(minutes % 60).padStart(2, "0")}
              </div>
            ))}
            {professionals.flatMap((professional, professionalIndex) =>
              slots.map((minutes, slotIndex) => {
                const working = isWorking(professional.id, minutes);
                const recurring = isRecurringBlock(professional.id, minutes);
                const appointment = appointmentAt(professional.id, minutes);
                const blocked = blockedAt(professional.id, minutes);
                const past =
                  date < today || (date === today && minutes <= nowMinutes);
                const unavailable = !working || recurring || past || Boolean(appointment) || Boolean(blocked);
                return (
                  <button
                    type="button"
                    className={`calendar-slot ${!working ? "off-hours" : ""} ${recurring ? "recurring" : ""} ${past ? "past-slot" : ""} ${appointment ? "occupied-slot" : ""} ${blocked ? "blocked-slot" : ""}`}
                    style={{
                      gridColumn: professionalIndex + 2,
                      gridRow: slotIndex + 2,
                    }}
                    key={`${professional.id}-${minutes}`}
                    disabled={unavailable}
                    aria-label={`${minutesToTime(minutes)}, ${professional.name}${unavailable ? ", indisponível" : ", horário livre"}`}
                    onClick={() => openFreeSlot(professional, minutes)}
                  />
                );
              }),
            )}
            {showNow && (
              <div
                className="current-time-line"
                style={{
                  top:
                    58 +
                    ((nowMinutes - startMinutes) / slotMinutes) * rowHeight,
                }}
              >
                <span>Agora</span>
              </div>
            )}
            {appointments.map((appointment) => {
              const column =
                professionals.findIndex(
                  (professional) =>
                    professional.id === appointment.professional_id,
                ) + 2;
              if (column < 2) return null;
              const start = localMinutes(appointment.starts_at, timezone);
              const end = localMinutes(appointment.ends_at, timezone);
              const awaitingCompletion =
                appointment.status === "CONFIRMED" &&
                new Date(appointment.ends_at) <= new Date(nowIso);
              const row =
                2 +
                Math.max(
                  0,
                  Math.floor((start - startMinutes) / slotMinutes),
                );
              const span = Math.max(
                1,
                Math.ceil(
                  (end - Math.max(start, startMinutes)) / slotMinutes,
                ),
              );
              return (
                <Link
                  href={`/painel/agendamentos/${appointment.id}`}
                  className={`calendar-event appointment-event status-${awaitingCompletion ? "awaiting" : appointment.status.toLowerCase()}`}
                  style={{
                    gridColumn: column,
                    gridRow: `${row} / span ${span}`,
                  }}
                  key={appointment.id}
                >
                  <div className="calendar-event-top">
                    <time>{shortTime(appointment.starts_at, timezone)}</time>
                    <em>
                      {awaitingCompletion ? "Aguardando confirmação" : statusLabels[appointment.status] ?? appointment.status}
                    </em>
                  </div>
                  <div className="calendar-event-person">
                    <b>{appointment.customers?.name?.slice(0, 1) ?? "C"}</b>
                    <div>
                      <strong>{appointment.customers?.name}</strong>
                      <span>{appointment.services?.name}</span>
                    </div>
                  </div>
                  <small>{appointment.customers?.phone}</small>
                  {awaitingCompletion && <span className="event-confirm-cta">Confirmar atendimento</span>}
                </Link>
              );
            })}
            {blockedTimes.map((blocked) => {
              const column =
                professionals.findIndex(
                  (professional) => professional.id === blocked.professional_id,
                ) + 2;
              if (column < 2) return null;
              const start = localMinutes(blocked.starts_at, timezone);
              const end = localMinutes(blocked.ends_at, timezone);
              const row =
                2 +
                Math.max(
                  0,
                  Math.floor((start - startMinutes) / slotMinutes),
                );
              const span = Math.max(
                1,
                Math.ceil(
                  (end - Math.max(start, startMinutes)) / slotMinutes,
                ),
              );
              return (
                <article
                  className="calendar-event blocked-event"
                  style={{
                    gridColumn: column,
                    gridRow: `${row} / span ${span}`,
                  }}
                  key={blocked.id}
                >
                  <div className="calendar-event-top">
                    <time>{shortTime(blocked.starts_at, timezone)}</time>
                    <em>Bloqueado</em>
                  </div>
                  <strong>{blocked.reason || "Indisponível"}</strong>
                </article>
              );
            })}
          </div>
        </div>
        <div className="mobile-agenda-timeline">
          {slots.map((minutes) => {
            const slotAppointments = activeAppointments.filter(
              (item) =>
                localMinutes(item.starts_at, timezone) >= minutes &&
                localMinutes(item.starts_at, timezone) < minutes + slotMinutes,
            );
            const slotBlocks = blockedTimes.filter(
              (item) =>
                localMinutes(item.starts_at, timezone) >= minutes &&
                localMinutes(item.starts_at, timezone) < minutes + slotMinutes,
            );
            const coveringAppointments = activeAppointments.filter((item) =>
              intervalOverlapsSlot(
                localMinutes(item.starts_at, timezone),
                localMinutes(item.ends_at, timezone),
                minutes,
                slotMinutes,
              ),
            );
            const coveringBlocks = blockedTimes.filter((item) =>
              intervalOverlapsSlot(
                localMinutes(item.starts_at, timezone),
                localMinutes(item.ends_at, timezone),
                minutes,
                slotMinutes,
              ),
            );
            const isCurrent =
              showNow &&
              nowMinutes >= minutes &&
              nowMinutes < minutes + slotMinutes;
            const singleProfessional = professionals[0];
            const coveringAppointment = singleProfessional
              ? coveringAppointments.find(
                  (item) => item.professional_id === singleProfessional.id,
                )
              : undefined;
            const coveringBlock = singleProfessional
              ? coveringBlocks.find(
                  (item) => item.professional_id === singleProfessional.id,
                )
              : undefined;
            const continuingAppointments = coveringAppointments.filter(
              (covering) =>
                !slotAppointments.some((item) => item.id === covering.id),
            );
            const continuingBlocks = coveringBlocks.filter(
              (covering) => !slotBlocks.some((item) => item.id === covering.id),
            );
            const mobileAvailable =
              Boolean(singleProfessional) &&
              isWorking(singleProfessional.id, minutes) &&
              !isRecurringBlock(singleProfessional.id, minutes) &&
              !coveringAppointment &&
              !coveringBlock &&
              !(date < today || (date === today && minutes <= nowMinutes));
            return (
              <div
                className={`mobile-time-row ${isCurrent ? "is-current" : ""} ${coveringAppointments.length ? "is-occupied" : ""} ${coveringBlocks.length ? "is-blocked" : ""}`}
                key={minutes}
              >
                <time>
                  {String(Math.floor(minutes / 60)).padStart(2, "0")}:
                  {String(minutes % 60).padStart(2, "0")}
                </time>
                <div>
                  {slotAppointments.map((item) => (
                    <Link
                      href={`/painel/agendamentos/${item.id}`}
                      className={`mobile-event status-${item.status === "CONFIRMED" && new Date(item.ends_at) <= new Date(nowIso) ? "awaiting" : item.status.toLowerCase()}`}
                      key={item.id}
                    >
                      <span className="mobile-event-heading">
                        <b>{item.customers?.name?.slice(0, 1) ?? "C"}</b>
                        <strong>{item.customers?.name}</strong>
                        <em>{item.status === "CONFIRMED" && new Date(item.ends_at) <= new Date(nowIso) ? "Aguardando confirmação" : statusLabels[item.status] ?? item.status}</em>
                      </span>
                      <span>
                        {item.services?.name} · {item.professionals?.name}
                      </span>
                    </Link>
                  ))}
                  {slotBlocks.map((item) => (
                    <article className="mobile-event is-blocked" key={item.id}>
                      <strong>Bloqueado</strong>
                      <span>{item.reason || "Indisponível"}</span>
                    </article>
                  ))}
                  {continuingAppointments.map((continuingAppointment) => (
                    <Link
                      href={`/painel/agendamentos/${continuingAppointment.id}`}
                      className={`mobile-event is-continuation status-${continuingAppointment.status.toLowerCase()}`}
                      key={`continuing-${continuingAppointment.id}`}
                    >
                      <strong>Horário ocupado</strong>
                      <span>
                        {continuingAppointment.customers?.name}
                        {professionals.length > 1 && continuingAppointment.professionals?.name
                          ? ` · ${continuingAppointment.professionals.name}`
                          : ""}{" "}
                        · até{" "}
                        {shortTime(continuingAppointment.ends_at, timezone)}
                      </span>
                    </Link>
                  ))}
                  {continuingBlocks.map((continuingBlock) => (
                    <article
                      className="mobile-event is-blocked is-continuation"
                      key={`continuing-${continuingBlock.id}`}
                    >
                      <strong>Bloqueado até {shortTime(continuingBlock.ends_at, timezone)}</strong>
                      <span>{continuingBlock.reason || "Indisponível"}</span>
                    </article>
                  ))}
                  {!slotAppointments.length &&
                    !slotBlocks.length &&
                    !continuingAppointments.length &&
                    !continuingBlocks.length &&
                    (professionals.length === 1 &&
                    singleProfessional &&
                    mobileAvailable ? (
                      <button
                        type="button"
                        className="mobile-free"
                        onClick={() =>
                          openFreeSlot(singleProfessional, minutes)
                        }
                      >
                        Horário livre <span>＋</span>
                      </button>
                    ) : (
                      <span className="mobile-free is-unavailable">
                        {professionals.length === 1
                          ? "Indisponível"
                          : "Sem eventos neste horário"}
                      </span>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
        {!appointments.length && !blockedTimes.length && (
          <p className="calendar-empty">
            Dia livre até agora. Use o botão “Bloquear horário” quando precisar
            reservar um período.
          </p>
        )}
      </section>
      {slotActionsOpen && selectedSlot && (
        <div
          className="block-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSlotActionsOpen(false);
          }}
        >
          <section
            className="slot-action-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slot-action-title"
          >
            <button
              type="button"
              className="dialog-close"
              aria-label="Fechar"
              onClick={() => setSlotActionsOpen(false)}
            >
              ×
            </button>
            <p className="eyebrow">Horário livre</p>
            <h2 id="slot-action-title">O que você quer fazer?</h2>
            <p>
              {selectedSlot.professionalName} ·{" "}
              {minutesToTime(selectedSlot.minutes)} em{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "long",
                timeZone: "UTC",
              }).format(new Date(`${date}T12:00:00Z`))}
            </p>
            <div className="slot-action-options">
              <Link
                className="button"
                href={`/painel/agendamentos/novo?professional=${selectedSlot.professionalId}&date=${date}&time=${minutesToTime(selectedSlot.minutes)}`}
              >
                Criar agendamento
              </Link>
              <button
                type="button"
                className="button-ghost"
                onClick={() => {
                  setSlotActionsOpen(false);
                  setBlockOpen(true);
                }}
              >
                Bloquear horário
              </button>
            </div>
          </section>
        </div>
      )}
      {blockOpen && (
        <div
          className="block-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setBlockOpen(false);
          }}
        >
          <section
            className="block-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-title"
          >
            <button
              type="button"
              className="dialog-close"
              aria-label="Fechar"
              onClick={() => setBlockOpen(false)}
            >
              ×
            </button>
            <div className="block-dialog-heading">
              <span>▦</span>
              <div>
                <p className="eyebrow">Nova indisponibilidade</p>
                <h2 id="block-title">Qual horário você quer bloquear?</h2>
                <p>
                  Escolha o dia e informe de que horas até que horas ficará
                  indisponível.
                </p>
              </div>
            </div>
            <form action={createBlockedTime} className="block-dialog-form">
              {professionals.length === 1 ? (
                <input
                  type="hidden"
                  name="professional_id"
                  value={selectedSlot?.professionalId ?? professionals[0].id}
                />
              ) : (
                <label className="full-field">
                  <span>Agenda de quem?</span>
                  <select
                    name="professional_id"
                    defaultValue={
                      selectedSlot?.professionalId ?? professionals[0]?.id
                    }
                    required
                  >
                    {professionals.map((professional) => (
                      <option value={professional.id} key={professional.id}>
                        {professional.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="full-field">
                <span>Qual dia?</span>
                <input
                  name="date"
                  type="date"
                  min={today}
                  defaultValue={date < today ? today : date}
                  required
                />
              </label>
              <label>
                <span>De que horas?</span>
                <input
                  name="start_time"
                  type="time"
                  step={slotMinutes * 60}
                  defaultValue={
                    selectedSlot ? minutesToTime(selectedSlot.minutes) : "09:00"
                  }
                  required
                />
              </label>
              <label>
                <span>Até que horas?</span>
                <input
                  name="end_time"
                  type="time"
                  step={slotMinutes * 60}
                  defaultValue={
                    selectedSlot
                      ? minutesToTime(selectedSlot.minutes + slotMinutes)
                      : "10:00"
                  }
                  required
                />
              </label>
              <label className="full-field">
                <span>
                  Motivo <small>(opcional)</small>
                </span>
                <input
                  name="reason"
                  maxLength={500}
                  placeholder="Ex.: almoço, compromisso ou reunião"
                />
              </label>
              <div className="block-dialog-tip">
                <strong>Importante:</strong> horários fora do expediente,
                durante o almoço ou já ocupados não poderão ser bloqueados
                novamente.
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => setBlockOpen(false)}
                >
                  Cancelar
                </button>
                <SubmitButton pendingText="Bloqueando...">
                  Confirmar bloqueio
                </SubmitButton>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
