import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

type AdminSummary = {
  business_count: number;
  active_business_count: number;
  user_count: number;
  professional_count: number;
  customer_count: number;
  appointment_count: number;
  today_appointment_count: number;
  new_business_count: number;
  recent_businesses: Array<{
    id: string;
    name: string;
    slug: string;
    active: boolean;
    created_at: string;
  }>;
  recent_appointments: Array<{
    id: string;
    starts_at: string;
    status: string;
    business_name: string;
    business_timezone: string;
    customer_name: string;
    professional_name: string;
  }>;
};

const emptySummary: AdminSummary = {
  business_count: 0,
  active_business_count: 0,
  user_count: 0,
  professional_count: 0,
  customer_count: 0,
  appointment_count: 0,
  today_appointment_count: 0,
  new_business_count: 0,
  recent_businesses: [],
  recent_appointments: [],
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const timezone = "America/Sao_Paulo";
  const todayLabel = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const today = fromZonedTime(`${todayLabel} 00:00:00`, timezone);
  const tomorrow = addDays(today, 1);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const { data } = await supabase.rpc("admin_dashboard_summary", {
    p_today_start: today.toISOString(),
    p_tomorrow_start: tomorrow.toISOString(),
    p_month_ago: monthAgo.toISOString(),
  });
  const summary = (data && typeof data === "object" && !Array.isArray(data)
    ? data
    : emptySummary) as unknown as AdminSummary;
  const stats = [
    ["Estabelecimentos", summary.business_count],
    ["Estabelecimentos ativos", summary.active_business_count],
    ["Usuários", summary.user_count],
    ["Profissionais", summary.professional_count],
    ["Clientes", summary.customer_count],
    ["Agendamentos", summary.appointment_count],
    ["Agendamentos hoje (Brasília)", summary.today_appointment_count],
    ["Novos estabelecimentos", summary.new_business_count],
  ];
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">NEXO ADMIN</p>
          <h1>Visão geral da plataforma</h1>
          <p className="muted">
            Agenda inteligente para negócios e profissionais.
          </p>
        </div>
        <Link className="button" href="/admin/empresas/nova">
          Novo estabelecimento
        </Link>
      </header>
      <section className="stat-grid admin-stats">
        {stats.map(([label, value]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{value ?? 0}</strong>
          </article>
        ))}
      </section>
      <div className="split-grid">
        <section className="panel-card">
          <div className="section-title">
            <h2>Últimos estabelecimentos</h2>
            <Link href="/admin/empresas">Ver todos</Link>
          </div>
          <div className="list">
            {summary.recent_businesses.map((business) => (
              <Link
                className="list-row"
                href={`/admin/empresas/${business.id}`}
                key={business.id}
              >
                <div>
                  <strong>{business.name}</strong>
                  <p>/{business.slug}</p>
                </div>
                <div className="align-right">
                  <span
                    className={
                      business.active ? "status-active" : "status-inactive"
                    }
                  >
                    {business.active ? "Ativo" : "Inativo"}
                  </span>
                  <small>
                    {formatDateTime(business.created_at, "America/Sao_Paulo")}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel-card">
          <div className="section-title">
            <h2>Agendamentos recentes</h2>
            <Link href="/admin/agendamentos">Ver todos</Link>
          </div>
          <div className="list">
            {summary.recent_appointments.map((appointment) => {
              return (
                <article className="list-row" key={appointment.id}>
                  <div>
                    <strong>{appointment.customer_name}</strong>
                    <p>{appointment.business_name}</p>
                  </div>
                  <div className="align-right">
                    <span>
                      {formatDateTime(
                        appointment.starts_at,
                        appointment.business_timezone ?? "America/Sao_Paulo",
                      )}
                    </span>
                    <small>
                      {appointment.professional_name} · {appointment.status}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
