"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ContactRound, Scissors, UserRound } from "lucide-react";
import { createInternalAppointment } from "@/app/actions/appointments";
import { formatCurrency } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

type Customer = { id: string; name: string; phone: string };
type Service = { id: string; name: string; price_cents: number; default_duration_minutes: number };
type Professional = { id: string; name: string; serviceIds: string[] };

export function ManualBookingForm({ slug, timezone, customers, services, professionals }: { slug: string; timezone: string; customers: Customer[]; services: Service[]; professionals: Professional[] }) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(customers.length ? "existing" : "new");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const availablePros = useMemo(() => professionals.filter((p) => p.serviceIds.includes(serviceId)), [professionals, serviceId]);
  const [professionalId, setProfessionalId] = useState("");
  const effectiveProfessionalId = availablePros.some((p) => p.id === professionalId) ? professionalId : (availablePros[0]?.id ?? "");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date()));
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  useEffect(() => {
    if (!serviceId || !effectiveProfessionalId || !date) return;
    const controller = new AbortController();
    fetch(`/api/public/availability?slug=${encodeURIComponent(slug)}&professional=${effectiveProfessionalId}&service=${serviceId}&date=${date}`, { signal: controller.signal })
      .then((r) => r.json()).then((body) => setSlots(body.slots ?? [])).catch(() => { if (!controller.signal.aborted) setSlots([]); });
    return () => controller.abort();
  }, [slug, serviceId, effectiveProfessionalId, date]);
  const selectedService = services.find((item) => item.id === serviceId);
  const localSlot = slot ? new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(slot)).replace(" ", "T") : "";
  return <form action={createInternalAppointment} className="booking-wizard-card">
    <header><div><p className="eyebrow">Novo atendimento</p><h1>Agendamento manual</h1><p>Cadastre ligações, mensagens e atendimentos presenciais usando a mesma disponibilidade da página pública.</p></div><div className="wizard-price"><small>Valor agendado</small><strong>{selectedService ? formatCurrency(selectedService.price_cents) : "—"}</strong></div></header>
    <div className="booking-step"><span><ContactRound /></span><div><h2>1. Cliente</h2><div className="segmented"><button type="button" className={customerMode === "existing" ? "active" : ""} onClick={() => setCustomerMode("existing")}>Cliente existente</button><button type="button" className={customerMode === "new" ? "active" : ""} onClick={() => setCustomerMode("new")}>Novo cliente</button></div>{customerMode === "existing" ? <label>Buscar cliente<select name="customer_id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required><option value="">Selecione</option>{customers.map((c) => <option value={c.id} key={c.id}>{c.name} · {c.phone}</option>)}</select></label> : <div className="field-grid"><input type="hidden" name="customer_id" value="" /><label>Nome<input name="customer_name" minLength={2} required /></label><label>WhatsApp<input name="customer_phone" placeholder="(11) 99999-9999" required /></label></div>}</div></div>
    <div className="booking-step"><span><Scissors /></span><div><h2>2. Serviço</h2><div className="choice-cards">{services.map((service) => <button type="button" className={serviceId === service.id ? "active" : ""} onClick={() => { setServiceId(service.id); setProfessionalId(""); setSlot(""); setSlots([]); }} key={service.id}><strong>{service.name}</strong><small>{service.default_duration_minutes} min · {formatCurrency(service.price_cents)}</small></button>)}</div><input type="hidden" name="service_id" value={serviceId} /></div></div>
    <div className="booking-step"><span><UserRound /></span><div><h2>3. Profissional</h2><div className="choice-cards professionals">{availablePros.map((professional) => <button type="button" className={effectiveProfessionalId === professional.id ? "active" : ""} onClick={() => { setProfessionalId(professional.id); setSlot(""); setSlots([]); }} key={professional.id}><strong>{professional.name}</strong>{effectiveProfessionalId === professional.id && <Check size={16} />}</button>)}</div><input type="hidden" name="professional_id" value={effectiveProfessionalId} /></div></div>
    <div className="booking-step"><span><CalendarDays /></span><div><h2>4. Data e horário</h2><label className="date-field">Dia<input type="date" min={new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date())} value={date} onChange={(e) => { setDate(e.target.value); setSlot(""); setSlots([]); }} /></label>{slots.length ? <div className="slot-grid">{slots.map((value) => <button type="button" className={slot === value ? "active" : ""} onClick={() => setSlot(value)} key={value}>{new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(value))}</button>)}</div> : <p className="empty-inline">Nenhum horário disponível nesse dia.</p>}<input type="hidden" name="starts_at" value={localSlot} /></div></div>
    <label className="notes-field">Observações internas<textarea name="notes" rows={3} placeholder="Preferências ou recados para a equipe" /></label>
    <footer><p>{slot ? `Confirmar para ${new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "full", timeStyle: "short" }).format(new Date(slot))}` : "Escolha um horário para continuar."}</p><SubmitButton disabled={!slot || !customerId && customerMode === "existing"}>Confirmar agendamento</SubmitButton></footer>
  </form>;
}
