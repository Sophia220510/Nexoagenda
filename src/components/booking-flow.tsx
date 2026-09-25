"use client";

import { useMemo, useRef, useState } from "react";
import type { PublicBusiness } from "@/types/domain";
import { formatCurrency } from "@/lib/format";

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function periodFor(value: string, timezone: string) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date(value)));
  if (hour < 12) return "Manhã";
  if (hour < 18) return "Tarde";
  return "Noite";
}

export function BookingFlow({ business }: { business: PublicBusiness }) {
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const idempotencyKey = useRef("");
  const professionals = useMemo(() => business.professionals.filter((professional) => professional.service_ids.includes(serviceId)), [business.professionals, serviceId]);
  const selectedService = business.services.find((service) => service.id === serviceId);
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => { const value = new Date(); value.setHours(12, 0, 0, 0); value.setDate(value.getDate() + index); return value; }), []);
  const groupedSlots = useMemo(() => slots.reduce<Record<string, string[]>>((groups, value) => { const period = periodFor(value, business.timezone); groups[period] = [...(groups[period] ?? []), value]; return groups; }, {}), [slots, business.timezone]);

  async function loadSlots(nextDate: string) {
    if (!serviceId || !professionalId || !nextDate) return;
    setDate(nextDate);
    setLoading(true);
    setMessage("");
    setSlot("");
    const params = new URLSearchParams({ slug: business.slug, professional: professionalId, service: serviceId, date: nextDate });
    const response = await fetch(`/api/public/availability?${params}`);
    const payload = await response.json() as { slots?: string[]; error?: string };
    setSlots(payload.slots ?? []);
    setMessage(payload.error ?? (!payload.slots?.length ? "Nenhum horário disponível neste dia. Escolha outra data." : ""));
    setLoading(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    const response = await fetch("/api/public/book", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      slug: business.slug, service_id: serviceId, professional_id: professionalId, starts_at: slot,
      customer_name: form.get("name"), customer_phone: form.get("phone"), idempotency_key: idempotencyKey.current,
    }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      if (response.status === 409) { setSlot(""); await loadSlots(date); setMessage("Esse horário acabou de ser reservado. Escolha outro horário."); }
      else setMessage(payload.error ?? "Não foi possível agendar.");
      setLoading(false);
      return;
    }
    setConfirmed(true);
    setLoading(false);
  }

  if (confirmed) return <section className="booking-success"><span>✓</span><h2>Agendamento confirmado</h2><p>Seu horário foi reservado.</p><div className="booking-summary"><strong>{selectedService?.name}</strong><span>{business.professionals.find((professional) => professional.id === professionalId)?.name}</span><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: business.timezone }).format(new Date(slot))}</span></div><p className="muted">Salve esta informação e, se necessário, fale com o estabelecimento.</p></section>;

  return <form onSubmit={submit} className="booking-card">
    <div className="step"><span>1</span><div><h2>Escolha o serviço</h2><div className="option-grid">{business.services.map((service) => <button type="button" className={serviceId === service.id ? "option selected" : "option"} onClick={() => { setServiceId(service.id); setProfessionalId(""); setDate(""); setSlots([]); }} key={service.id}><strong>{service.name}</strong><small>{formatCurrency(service.price_cents)} · {service.default_duration_minutes} min</small></button>)}</div></div></div>
    {serviceId && <div className="step"><span>2</span><div><h2>Escolha o profissional</h2><div className="option-grid">{professionals.map((professional) => <button type="button" className={professionalId === professional.id ? "option selected" : "option"} onClick={() => { setProfessionalId(professional.id); setDate(""); setSlots([]); setSlot(""); }} key={professional.id}><strong>{professional.name}</strong><small>{professional.bio || "Profissional disponível"}</small></button>)}</div></div></div>}
    {professionalId && <div className="step"><span>3</span><div><h2>Escolha o dia</h2><p className="step-helper">Veja os próximos 14 dias e escolha a melhor data.</p><div className="booking-days">{dates.map((value, index) => {
      const key = dateKey(value);
      return <button type="button" className={date === key ? "booking-day selected" : "booking-day"} onClick={() => loadSlots(key)} key={key}><small>{index === 0 ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(value).replace(".", "")}</small><strong>{value.getDate()}</strong><span>{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(value).replace(".", "")}</span></button>;
    })}</div>{loading && <div className="slots-loading">Buscando horários disponíveis…</div>}{date && !loading && <div className="slot-periods">{["Manhã", "Tarde", "Noite"].map((period) => groupedSlots[period]?.length ? <section key={period}><h3><span>{period === "Manhã" ? "☀" : period === "Tarde" ? "◐" : "☾"}</span>{period}</h3><div className="slots">{groupedSlots[period].map((value) => <button type="button" className={slot === value ? "slot selected" : "slot"} onClick={() => setSlot(value)} key={value}>{new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: business.timezone }).format(new Date(value))}</button>)}</div></section> : null)}</div>}</div></div>}
    {slot && <div className="step"><span>4</span><div><h2>Seus dados</h2><div className="field-grid"><label>Nome<input name="name" required minLength={2} /></label><label>WhatsApp<input name="phone" required inputMode="tel" /></label></div><div className="booking-summary"><strong>{selectedService?.name}</strong><span>{business.professionals.find((professional) => professional.id === professionalId)?.name}</span><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: business.timezone }).format(new Date(slot))}</span></div><button className="button" disabled={loading}>{loading ? "Confirmando..." : "Confirmar agendamento"}</button></div></div>}
    {message && <p className="notice notice-error" role="status">{message}</p>}
  </form>;
}
