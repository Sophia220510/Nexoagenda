import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Settings2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfessional } from "@/lib/auth";
import type { Membership } from "@/types/domain";

export async function ProfessionalDashboard({
  membership,
  firstName,
}: {
  membership: Membership;
  firstName: string;
}) {
  const professional = await getCurrentProfessional();
  if (!professional?.setup_completed_at) {
    return (
      <section className="professional-welcome">
        <span><Sparkles /></span>
        <p className="eyebrow">Bem-vindo à NEXO</p>
        <h1>Prepare sua agenda para começar.</h1>
        <p>
          Selecione os serviços que você realiza, sua jornada e seus intervalos.
          Leva poucos minutos.
        </p>
        <Link className="button button-lime" href="/painel/configuracao-inicial">
          Configurar minha agenda <ArrowRight size={18} />
        </Link>
      </section>
    );
  }

  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const now = new Date();
  const todayKey = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const todayStart = fromZonedTime(`${todayKey} 00:00:00`, timezone);
  const tomorrow = addDays(todayStart, 1);
  const weekEnd = addDays(todayStart, 7);
  const supabase = await createClient();
  const [today, week, pending, services] = await Promise.all([
    supabase
      .from("appointments")
      .select("id,starts_at,ends_at,status,customers(name),services(name)")
      .eq("professional_id", professional.id)
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", tomorrow.toISOString())
      .neq("status", "CANCELLED")
      .order("starts_at"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professional.id)
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .neq("status", "CANCELLED"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professional.id)
      .eq("status", "CONFIRMED")
      .lte("ends_at", now.toISOString()),
    supabase
      .from("professional_services")
      .select("service_id", { count: "exact", head: true })
      .eq("professional_id", professional.id)
      .eq("active", true),
  ]);
  const upcoming = (today.data ?? []).filter(
    (appointment) => new Date(appointment.ends_at) >= now,
  );
  const next = upcoming[0];

  return (
    <>
      <header className="professional-hero">
        <div>
          <p className="eyebrow">Seu dia na NEXO</p>
          <h1>Olá{firstName ? `, ${firstName}` : ""}.</h1>
          <p>
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              timeZone: timezone,
            }).format(now)}
          </p>
        </div>
        <div className="professional-hero-next">
          <span>Próximo atendimento</span>
          {next ? (
            <>
              <strong>{formatInTimeZone(next.starts_at, timezone, "HH:mm")}</strong>
              <small>
                {(next.customers as unknown as { name: string } | null)?.name} ·{" "}
                {(next.services as unknown as { name: string } | null)?.name}
              </small>
            </>
          ) : (
            <strong className="is-free">Agenda livre</strong>
          )}
        </div>
      </header>

      {(pending.count ?? 0) > 0 && (
        <Link className="professional-alert" href="/painel/minha-agenda">
          <AlertCircle size={20} />
          <span>
            <strong>{pending.count} atendimento{pending.count === 1 ? "" : "s"} para concluir</strong>
            <small>Atualize o resultado para manter sua agenda organizada.</small>
          </span>
          <ArrowRight size={18} />
        </Link>
      )}

      <section className="professional-metrics">
        <article><CalendarCheck2 /><span>Hoje<strong>{today.data?.length ?? 0}</strong><small>atendimentos</small></span></article>
        <article><CalendarDays /><span>Próximos 7 dias<strong>{week.count ?? 0}</strong><small>agendamentos</small></span></article>
        <article><Sparkles /><span>Seus serviços<strong>{services.count ?? 0}</strong><small>ativos no catálogo</small></span></article>
      </section>

      <div className="professional-home-grid">
        <section className="panel-card professional-day-card">
          <div className="section-title">
            <div><p className="eyebrow">Hoje</p><h2>Sua sequência do dia</h2></div>
            <Link href="/painel/minha-agenda">Agenda completa</Link>
          </div>
          {upcoming.length ? (
            <div className="professional-timeline">
              {upcoming.slice(0, 6).map((appointment, index) => (
                <Link href={`/painel/agendamentos/${appointment.id}`} key={appointment.id}>
                  <time>{formatInTimeZone(appointment.starts_at, timezone, "HH:mm")}</time>
                  <i className={index === 0 ? "active" : ""} />
                  <span>
                    <strong>{(appointment.customers as unknown as { name: string } | null)?.name}</strong>
                    <small>{(appointment.services as unknown as { name: string } | null)?.name}</small>
                  </span>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <CalendarCheck2 />
              <h3>Nenhum atendimento restante hoje</h3>
              <p>Aproveite o tempo livre ou confira os próximos dias.</p>
            </div>
          )}
        </section>
        <aside className="professional-shortcuts">
          <p className="eyebrow">Acesso rápido</p>
          <h2>O que você precisa fazer?</h2>
          <Link href="/painel/minha-agenda"><CalendarDays /><span><strong>Abrir minha agenda</strong><small>Ver clientes e bloquear horários</small></span><ArrowRight /></Link>
          <Link href="/painel/meus-horarios"><Clock3 /><span><strong>Configurar horários</strong><small>Jornada, pausas e serviços</small></span><ArrowRight /></Link>
          <Link href="/painel/notificacoes"><Settings2 /><span><strong>Ver notificações</strong><small>Alterações importantes da rotina</small></span><ArrowRight /></Link>
        </aside>
      </div>
    </>
  );
}
