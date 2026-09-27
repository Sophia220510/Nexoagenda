import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CircleX, MessageCircle } from "lucide-react";
import {
  rescheduleAppointment,
  setAppointmentStatus,
  updateAppointmentNote,
} from "@/app/actions/appointments";
import { Notice } from "@/components/notice";
import { AppointmentCompletion } from "@/components/appointment-completion";
import { SubmitButton } from "@/components/submit-button";
import { requireMembership } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const statusLabel: Record<string, string> = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};
const sourceLabel: Record<string, string> = {
  PUBLIC: "Página pública",
  OWNER: "Criado pelo proprietário",
  PROFESSIONAL: "Criado pelo profissional",
  ADMIN: "Criado pelo Master",
};

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const membership = await requireMembership();
  const isOperator =
    membership.role === "OWNER" || membership.role === "RECEPTIONIST";
  const { appointmentId } = await params;
  const supabase = await createClient();
  const [{ data: appointment }, { data: professionals }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id,starts_at,ends_at,status,notes,created_at,appointment_source,price_cents_snapshot,duration_minutes_snapshot,cancelled_at,cancellation_reason,realized_total_cents,payment_status,discount_cents,appointment_items(id,service_name_snapshot,unit_price_cents,quantity),payments(id,amount_cents,method,status),customers(id,name,phone),services(id,name,price_cents,default_duration_minutes),professionals(id,name)",
      )
      .eq("id", appointmentId)
      .eq("business_id", membership.business_id)
      .maybeSingle(),
    supabase
      .from("professionals")
      .select("id,name,professional_services(service_id,active)")
      .eq("business_id", membership.business_id)
      .eq("active", true)
      .order("name"),
  ]);
  if (!appointment) notFound();
  const customer = appointment.customers as unknown as {
    id: string;
    name: string;
    phone: string;
  };
  const service = appointment.services as unknown as {
    id: string;
    name: string;
    price_cents: number;
    default_duration_minutes: number;
  };
  const professional = appointment.professionals as unknown as {
    id: string;
    name: string;
  };
  const { data: availableServices } = await supabase
    .from("professional_services")
    .select(
      "service_id,price_override_cents,duration_override_minutes,services(id,name,price_cents,default_duration_minutes,active)",
    )
    .eq("professional_id", professional.id)
    .eq("active", true);
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const eligible = (professionals ?? []).filter((p) =>
    (
      p.professional_services as Array<{ service_id: string; active: boolean }>
    ).some((link) => link.active && link.service_id === service.id),
  );
  return (
    <>
      <div className="back-row">
        <Link
          href={isOperator ? "/painel/agendamentos" : "/painel/minha-agenda"}
        >
          <ArrowLeft size={17} />{" "}
          {isOperator ? "Todos os agendamentos" : "Minha agenda"}
        </Link>
      </div>
      <Notice {...await searchParams} />
      <header className="detail-hero">
        <div>
          <span
            className={`status-pill status-${appointment.status.toLowerCase()}`}
          >
            {statusLabel[appointment.status]}
          </span>
          <h1>{customer.name}</h1>
          <p>
            {service.name} com {professional.name}
          </p>
        </div>
        <a
          className="button-ghost"
          href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={18} /> WhatsApp
        </a>
      </header>
      <div className="detail-layout">
        <section className="detail-card">
          <h2>Detalhes do atendimento</h2>
          <dl className="detail-grid">
            <div>
              <dt>Data e hora</dt>
              <dd>{formatDateTime(appointment.starts_at, timezone)}</dd>
            </div>
            <div>
              <dt>Duração</dt>
              <dd>
                {appointment.duration_minutes_snapshot ??
                  service.default_duration_minutes}{" "}
                minutos
              </dd>
            </div>
            <div>
              <dt>Valor agendado</dt>
              <dd>
                {formatCurrency(
                  appointment.price_cents_snapshot ?? service.price_cents,
                )}
              </dd>
            </div>
            <div>
              <dt>Origem</dt>
              <dd>
                {sourceLabel[appointment.appointment_source] ??
                  appointment.appointment_source}
              </dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{customer.phone}</dd>
            </div>
            <div>
              <dt>Criado em</dt>
              <dd>{formatDateTime(appointment.created_at, timezone)}</dd>
            </div>
          </dl>
          {appointment.cancellation_reason && (
            <div className="cancellation-note">
              <strong>Motivo do cancelamento</strong>
              <p>{appointment.cancellation_reason}</p>
            </div>
          )}
        </section>
        <aside className="action-card completion-card">
          {appointment.status === "CONFIRMED" ? (
            <AppointmentCompletion
              appointmentId={appointment.id}
              customerName={customer.name}
              originalServiceId={service.id}
              canDiscount={isOperator}
              canComplete={new Date(appointment.ends_at) <= new Date()}
              services={(availableServices ?? []).flatMap((link) => {
                const item = link.services as unknown as {
                  id: string;
                  name: string;
                  price_cents: number;
                  default_duration_minutes: number;
                  active: boolean;
                } | null;
                return item?.active
                  ? [
                      {
                        id: item.id,
                        name: item.name,
                        price_cents:
                          link.price_override_cents ?? item.price_cents,
                        duration_minutes:
                          link.duration_override_minutes ??
                          item.default_duration_minutes,
                      },
                    ]
                  : [];
              })}
            />
          ) : (
            <div className="completion-resolved">
              <p className="eyebrow">Atendimento resolvido</p>
              <h2>{statusLabel[appointment.status]}</h2>
              {appointment.status === "COMPLETED" && (
                <>
                  <strong>
                    {formatCurrency(appointment.realized_total_cents ?? 0)}
                  </strong>
                  <small>
                    {appointment.payment_status === "PAID"
                      ? "Pagamento completo"
                      : appointment.payment_status === "PARTIAL"
                        ? "Pagamento parcial"
                        : "Pagamento pendente"}
                  </small>
                </>
              )}
            </div>
          )}
          {appointment.status === "CONFIRMED" &&
            isOperator &&
            new Date(appointment.ends_at) > new Date() && (
              <details>
                <summary>
                  <CircleX /> Cancelar agendamento
                </summary>
                <form
                  action={setAppointmentStatus}
                  className="form-stack compact"
                >
                  <input
                    type="hidden"
                    name="appointment_id"
                    value={appointment.id}
                  />
                  <input type="hidden" name="status" value="CANCELLED" />
                  <label>
                    Motivo (opcional)
                    <textarea name="reason" rows={2} />
                  </label>
                  <SubmitButton className="button-danger">
                    Confirmar cancelamento
                  </SubmitButton>
                </form>
              </details>
            )}
        </aside>
        {isOperator &&
          appointment.status === "CONFIRMED" &&
          new Date(appointment.starts_at) > new Date() && (
            <section className="detail-card">
              <h2>
                <CalendarClock size={20} /> Reagendar
              </h2>
              <p className="muted">
                A disponibilidade real será validada antes de salvar. O horário
                atual só é liberado após a confirmação do novo.
              </p>
              <form action={rescheduleAppointment} className="reschedule-form">
                <input
                  type="hidden"
                  name="appointment_id"
                  value={appointment.id}
                />
                <label>
                  Profissional
                  <select name="professional_id" defaultValue={professional.id}>
                    {eligible.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nova data e hora
                  <input
                    type="datetime-local"
                    name="starts_at"
                    step="900"
                    required
                  />
                </label>
                <SubmitButton>Reagendar</SubmitButton>
              </form>
            </section>
          )}
        {isOperator ? (
          <section className="detail-card">
            <h2>Notas internas</h2>
            <form action={updateAppointmentNote} className="form-stack">
              <input
                type="hidden"
                name="appointment_id"
                value={appointment.id}
              />
              <textarea
                name="notes"
                rows={5}
                defaultValue={appointment.notes ?? ""}
                placeholder="Preferências, observações ou informações importantes"
              />
              <SubmitButton className="button-ghost">Salvar nota</SubmitButton>
            </form>
          </section>
        ) : appointment.notes ? (
          <section className="detail-card">
            <h2>Observações do atendimento</h2>
            <p className="muted appointment-note-copy">{appointment.notes}</p>
          </section>
        ) : null}
        {appointment.status === "COMPLETED" && (
          <section className="detail-card completed-breakdown">
            <h2>Resumo realizado</h2>
            <div className="completed-items">
              {(
                appointment.appointment_items as unknown as Array<{
                  id: string;
                  service_name_snapshot: string;
                  unit_price_cents: number;
                  quantity: number;
                }>
              ).map((item) => (
                <p key={item.id}>
                  <span>
                    {item.service_name_snapshot}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </span>
                  <strong>
                    {formatCurrency(item.unit_price_cents * item.quantity)}
                  </strong>
                </p>
              ))}
            </div>
            <hr />
            <p>
              <span>Total realizado</span>
              <strong>
                {formatCurrency(appointment.realized_total_cents ?? 0)}
              </strong>
            </p>
            <p>
              <span>Recebido</span>
              <strong>
                {formatCurrency(
                  (
                    appointment.payments as unknown as Array<{
                      amount_cents: number;
                      status: string;
                    }>
                  )
                    .filter((payment) => payment.status === "PAID")
                    .reduce((sum, payment) => sum + payment.amount_cents, 0),
                )}
              </strong>
            </p>
          </section>
        )}
      </div>
    </>
  );
}
