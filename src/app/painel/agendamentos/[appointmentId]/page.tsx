import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, CircleX, MessageCircle, UserX } from "lucide-react";
import { rescheduleAppointment, setAppointmentStatus, updateAppointmentNote } from "@/app/actions/appointments";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const statusLabel: Record<string, string> = { CONFIRMED: "Confirmado", COMPLETED: "Concluído", CANCELLED: "Cancelado", NO_SHOW: "Não compareceu" };
const sourceLabel: Record<string, string> = { PUBLIC: "Página pública", OWNER: "Criado pelo proprietário", PROFESSIONAL: "Criado pelo profissional", ADMIN: "Criado pelo Master" };

export default async function AppointmentDetailPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const membership = await requireOwner(); const { appointmentId } = await params; const supabase = await createClient();
  const [{ data: appointment }, { data: professionals }] = await Promise.all([
    supabase.from("appointments").select("id,starts_at,ends_at,status,notes,created_at,appointment_source,price_cents_snapshot,duration_minutes_snapshot,cancelled_at,cancellation_reason,customers(id,name,phone),services(id,name,price_cents,default_duration_minutes),professionals(id,name)").eq("id", appointmentId).eq("business_id", membership.business_id).maybeSingle(),
    supabase.from("professionals").select("id,name,professional_services(service_id,active)").eq("business_id", membership.business_id).eq("active", true).order("name"),
  ]);
  if (!appointment) notFound();
  const customer = appointment.customers as unknown as { id: string; name: string; phone: string }; const service = appointment.services as unknown as { id: string; name: string; price_cents: number; default_duration_minutes: number }; const professional = appointment.professionals as unknown as { id: string; name: string };
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const eligible = (professionals ?? []).filter((p) => (p.professional_services as Array<{ service_id: string; active: boolean }>).some((link) => link.active && link.service_id === service.id));
  return <><div className="back-row"><Link href="/painel/agendamentos"><ArrowLeft size={17} /> Todos os agendamentos</Link></div><Notice {...await searchParams} />
    <header className="detail-hero"><div><span className={`status-pill status-${appointment.status.toLowerCase()}`}>{statusLabel[appointment.status]}</span><h1>{customer.name}</h1><p>{service.name} com {professional.name}</p></div><a className="button-ghost" href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a></header>
    <div className="detail-layout"><section className="detail-card"><h2>Detalhes do atendimento</h2><dl className="detail-grid"><div><dt>Data e hora</dt><dd>{formatDateTime(appointment.starts_at, timezone)}</dd></div><div><dt>Duração</dt><dd>{appointment.duration_minutes_snapshot ?? service.default_duration_minutes} minutos</dd></div><div><dt>Valor agendado</dt><dd>{formatCurrency(appointment.price_cents_snapshot ?? service.price_cents)}</dd></div><div><dt>Origem</dt><dd>{sourceLabel[appointment.appointment_source] ?? appointment.appointment_source}</dd></div><div><dt>WhatsApp</dt><dd>{customer.phone}</dd></div><div><dt>Criado em</dt><dd>{formatDateTime(appointment.created_at, timezone)}</dd></div></dl>{appointment.cancellation_reason && <div className="cancellation-note"><strong>Motivo do cancelamento</strong><p>{appointment.cancellation_reason}</p></div>}</section>
      <aside className="action-card"><h2>Ações</h2>{appointment.status !== "CANCELLED" && <><form action={setAppointmentStatus}><input type="hidden" name="appointment_id" value={appointment.id} /><input type="hidden" name="status" value="COMPLETED" /><SubmitButton className="action-button success"><CheckCircle2 /> Concluir atendimento</SubmitButton></form><form action={setAppointmentStatus}><input type="hidden" name="appointment_id" value={appointment.id} /><input type="hidden" name="status" value="NO_SHOW" /><SubmitButton className="action-button"><UserX /> Cliente não compareceu</SubmitButton></form><details><summary><CircleX /> Cancelar agendamento</summary><form action={setAppointmentStatus} className="form-stack compact"><input type="hidden" name="appointment_id" value={appointment.id} /><input type="hidden" name="status" value="CANCELLED" /><label>Motivo (opcional)<textarea name="reason" rows={2} /></label><SubmitButton className="button-danger">Confirmar cancelamento</SubmitButton></form></details></>}</aside>
      {appointment.status !== "CANCELLED" && <section className="detail-card"><h2><CalendarClock size={20} /> Reagendar</h2><p className="muted">A disponibilidade real será validada antes de salvar. O horário atual só é liberado após a confirmação do novo.</p><form action={rescheduleAppointment} className="reschedule-form"><input type="hidden" name="appointment_id" value={appointment.id} /><label>Profissional<select name="professional_id" defaultValue={professional.id}>{eligible.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Nova data e hora<input type="datetime-local" name="starts_at" step="900" required /></label><SubmitButton>Reagendar</SubmitButton></form></section>}
      <section className="detail-card"><h2>Notas internas</h2><form action={updateAppointmentNote} className="form-stack"><input type="hidden" name="appointment_id" value={appointment.id} /><textarea name="notes" rows={5} defaultValue={appointment.notes ?? ""} placeholder="Preferências, observações ou informações importantes" /><SubmitButton className="button-ghost">Salvar nota</SubmitButton></form></section>
    </div>
  </>;
}
