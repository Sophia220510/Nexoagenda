"use client";

import { useMemo, useState } from "react";
import { saveProfessionalConfiguration } from "@/app/actions/business";
import { SubmitButton } from "@/components/submit-button";

type Service = { id: string; name: string; default_duration_minutes: number };
type Assigned = { service_id: string; duration_override_minutes: number | null; active: boolean };
type Range = { weekday: number; start_time: string; end_time: string };
type Block = Range & { reason?: string | null };

const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function ProfessionalSetupWizard({ professionalId, services, assigned, hours, blocks, ownerMode = false }: {
  professionalId: string; services: Service[]; assigned: Assigned[]; hours: Range[]; blocks: Block[]; ownerMode?: boolean;
}) {
  const [step, setStep] = useState(1);
  const initialSelected = new Set(assigned.filter((item) => item.active).map((item) => item.service_id));
  const [selected, setSelected] = useState<string[]>([...initialSelected]);
  const [durations, setDurations] = useState<Record<string, number>>(() => Object.fromEntries(services.map((service) => [service.id, assigned.find((item) => item.service_id === service.id)?.duration_override_minutes ?? service.default_duration_minutes])));
  const [schedule, setSchedule] = useState<Record<number, { active: boolean; start: string; end: string }>>(() => Object.fromEntries(days.map((_, weekday) => { const current = hours.find((item) => item.weekday === weekday); return [weekday, { active: Boolean(current), start: current?.start_time.slice(0, 5) ?? "09:00", end: current?.end_time.slice(0, 5) ?? "18:00" }]; })));
  const [breaks, setBreaks] = useState<Record<number, { active: boolean; start: string; end: string }>>(() => Object.fromEntries(days.map((_, weekday) => { const current = blocks.find((item) => item.weekday === weekday); return [weekday, { active: Boolean(current), start: current?.start_time.slice(0, 5) ?? "12:00", end: current?.end_time.slice(0, 5) ?? "13:00" }]; })));
  const payload = useMemo(() => ({
    services: selected.map((service_id) => ({ service_id, duration_override_minutes: Number(durations[service_id]) })),
    working_hours: Object.entries(schedule).filter(([, value]) => value.active).map(([weekday, value]) => ({ weekday: Number(weekday), start_time: value.start, end_time: value.end })),
    recurring_blocks: Object.entries(breaks).filter(([weekday, value]) => value.active && schedule[Number(weekday)].active).map(([weekday, value]) => ({ weekday: Number(weekday), start_time: value.start, end_time: value.end, reason: "Intervalo" })),
  }), [selected, durations, schedule, breaks]);

  const toggleService = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  return <section className="panel-card wizard-card">
    <div className="wizard-progress">{[1,2,3,4,5,6].map((number) => <span key={number} className={number <= step ? "active" : ""}>{number}</span>)}</div>
    {step === 1 && <div><p className="eyebrow">Etapa 1 de 6</p><h2>Quais serviços você realiza?</h2><div className="choice-grid">{services.map((service) => <label className={selected.includes(service.id) ? "choice active" : "choice"} key={service.id}><input type="checkbox" checked={selected.includes(service.id)} onChange={() => toggleService(service.id)} /> <strong>{service.name}</strong></label>)}</div></div>}
    {step === 2 && <div><p className="eyebrow">Etapa 2 de 6</p><h2>Quanto tempo você precisa?</h2><div className="form-stack compact">{services.filter((service) => selected.includes(service.id)).map((service) => <label key={service.id}>{service.name}<div className="duration-control"><input type="number" min="5" max="480" step="5" value={durations[service.id]} onChange={(event) => setDurations({ ...durations, [service.id]: Number(event.target.value) })} /><span>minutos</span></div></label>)}</div></div>}
    {step === 3 && <div><p className="eyebrow">Etapa 3 de 6</p><h2>Em quais dias você trabalha?</h2><div className="choice-grid">{days.map((day, weekday) => <label className={schedule[weekday].active ? "choice active" : "choice"} key={day}><input type="checkbox" checked={schedule[weekday].active} onChange={(event) => setSchedule({ ...schedule, [weekday]: { ...schedule[weekday], active: event.target.checked } })} /> <strong>{day}</strong></label>)}</div></div>}
    {step === 4 && <div><p className="eyebrow">Etapa 4 de 6</p><h2>Defina sua jornada</h2><button type="button" className="button-ghost apply-all" onClick={() => { const source=Object.values(schedule).find((item)=>item.active); if(source)setSchedule(Object.fromEntries(Object.entries(schedule).map(([day,value])=>[day,value.active?{...value,start:source.start,end:source.end}:value]))); }}>Aplicar a todos</button><div className="schedule-grid">{days.map((day, weekday) => schedule[weekday].active && <div className="schedule-row" key={day}><strong>{day}</strong><input type="time" value={schedule[weekday].start} onChange={(event) => setSchedule({ ...schedule, [weekday]: { ...schedule[weekday], start: event.target.value } })} /><span>até</span><input type="time" value={schedule[weekday].end} onChange={(event) => setSchedule({ ...schedule, [weekday]: { ...schedule[weekday], end: event.target.value } })} /></div>)}</div></div>}
    {step === 5 && <div><p className="eyebrow">Etapa 5 de 6</p><h2>Adicione intervalos recorrentes</h2><p className="muted">Use para almoço ou uma pausa fixa. Você poderá criar bloqueios pontuais na agenda.</p><div className="schedule-grid">{days.map((day, weekday) => schedule[weekday].active && <div className="schedule-row" key={day}><label className="check"><input type="checkbox" checked={breaks[weekday].active} onChange={(event) => setBreaks({ ...breaks, [weekday]: { ...breaks[weekday], active: event.target.checked } })} />{day}</label><input type="time" disabled={!breaks[weekday].active} value={breaks[weekday].start} onChange={(event) => setBreaks({ ...breaks, [weekday]: { ...breaks[weekday], start: event.target.value } })} /><span>até</span><input type="time" disabled={!breaks[weekday].active} value={breaks[weekday].end} onChange={(event) => setBreaks({ ...breaks, [weekday]: { ...breaks[weekday], end: event.target.value } })} /></div>)}</div></div>}
    {step === 6 && <div><p className="eyebrow">Etapa 6 de 6</p><h2>Revise sua configuração</h2><div className="summary-box"><strong>{selected.length} serviços selecionados</strong><span>{payload.working_hours.length} dias de atendimento</span><span>{payload.recurring_blocks.length} intervalos recorrentes</span></div><form action={saveProfessionalConfiguration}><input type="hidden" name="professional_id" value={professionalId} /><input type="hidden" name="services" value={JSON.stringify(payload.services)} /><input type="hidden" name="working_hours" value={JSON.stringify(payload.working_hours)} /><input type="hidden" name="recurring_blocks" value={JSON.stringify(payload.recurring_blocks)} /><SubmitButton>{ownerMode ? "Salvar configuração" : "Concluir e abrir minha agenda"}</SubmitButton></form></div>}
    <div className="wizard-actions">{step > 1 && <button type="button" className="button-ghost" onClick={() => setStep(step - 1)}>Voltar</button>}{step < 6 && <button type="button" className="button" disabled={(step === 1 && !selected.length) || (step === 3 && !payload.working_hours.length)} onClick={() => setStep(step + 1)}>Continuar</button>}</div>
  </section>;
}
