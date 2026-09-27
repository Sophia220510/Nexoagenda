import { addDays, startOfMonth } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { BarChart3, Scissors, UsersRound } from "lucide-react";
import { requireOperator } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const membership = await requireOperator();
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const monthStart = startOfMonth(new Date());
  const start = fromZonedTime(monthStart, timezone);
  const end = addDays(startOfMonth(addDays(monthStart, 35)), 0);
  const supabase = await createClient();
  const [{ data: appointments }, { data: items }, { data: customers }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id,status,realized_total_cents,professional_id,professionals(name)",
        )
        .eq("business_id", membership.business_id)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString()),
      supabase
        .from("appointment_items")
        .select(
          "service_name_snapshot,unit_price_cents,quantity,appointments!inner(business_id,completed_at)",
        )
        .eq("appointments.business_id", membership.business_id)
        .gte("appointments.completed_at", start.toISOString())
        .lt("appointments.completed_at", end.toISOString()),
      supabase
        .from("customers")
        .select("id,created_at")
        .eq("business_id", membership.business_id),
    ]);
  const completed = (appointments ?? []).filter(
    (item) => item.status === "COMPLETED",
  );
  const noShows = (appointments ?? []).filter(
    (item) => item.status === "NO_SHOW",
  ).length;
  const cancellations = (appointments ?? []).filter(
    (item) => item.status === "CANCELLED",
  ).length;
  const byProfessional = new Map<
    string,
    { name: string; count: number; value: number }
  >();
  for (const item of completed) {
    const professional = item.professionals as unknown as { name: string };
    const row = byProfessional.get(item.professional_id) ?? {
      name: professional?.name ?? "Profissional",
      count: 0,
      value: 0,
    };
    row.count += 1;
    row.value += item.realized_total_cents ?? 0;
    byProfessional.set(item.professional_id, row);
  }
  const byService = new Map<string, { count: number; value: number }>();
  for (const item of items ?? []) {
    const row = byService.get(item.service_name_snapshot) ?? {
      count: 0,
      value: 0,
    };
    row.count += 1;
    row.value += item.unit_price_cents * item.quantity;
    byService.set(item.service_name_snapshot, row);
  }
  const total = completed.reduce(
    (sum, item) => sum + (item.realized_total_cents ?? 0),
    0,
  );
  const maxProfessional = Math.max(
    1,
    ...[...byProfessional.values()].map((item) => item.value),
  );
  const maxService = Math.max(
    1,
    ...[...byService.values()].map((item) => item.value),
  );
  const newCustomers = (customers ?? []).filter(
    (item) => new Date(item.created_at) >= start,
  ).length;
  return (
    <>
      <header className="page-header premium">
        <div>
          <p className="eyebrow">Inteligência operacional</p>
          <h1>Relatórios</h1>
          <p className="muted">
            Resultados reais do mês atual, baseados em atendimentos concluídos.
          </p>
        </div>
      </header>
      <section className="finance-metrics">
        <article>
          <BarChart3 />
          <span>Faturamento realizado</span>
          <strong>{formatCurrency(total)}</strong>
          <small>{completed.length} atendimentos concluídos</small>
        </article>
        <article>
          <UsersRound />
          <span>Novos clientes</span>
          <strong>{newCustomers}</strong>
          <small>cadastrados no mês</small>
        </article>
        <article className="is-warning">
          <span>Faltas</span>
          <strong>{noShows}</strong>
          <small>não comparecimentos</small>
        </article>
        <article>
          <span>Cancelamentos</span>
          <strong>{cancellations}</strong>
          <small>no período</small>
        </article>
      </section>
      <div className="finance-columns">
        <section className="finance-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Equipe</p>
              <h2>Produção por profissional</h2>
            </div>
          </div>
          <div className="report-bars">
            {[...byProfessional.values()]
              .sort((a, b) => b.value - a.value)
              .map((item) => (
                <article key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.count} atendimentos</small>
                  </div>
                  <i>
                    <b
                      style={{
                        width: `${(item.value / maxProfessional) * 100}%`,
                      }}
                    />
                  </i>
                  <span>{formatCurrency(item.value)}</span>
                </article>
              ))}
          </div>
        </section>
        <section className="finance-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Catálogo</p>
              <h2>Serviços mais vendidos</h2>
            </div>
          </div>
          {byService.size ? (
            <div className="report-bars">
              {[...byService.entries()]
                .sort((a, b) => b[1].value - a[1].value)
                .map(([name, item]) => (
                  <article key={name}>
                    <div>
                      <strong>{name}</strong>
                      <small>{item.count} vendas</small>
                    </div>
                    <i>
                      <b
                        style={{ width: `${(item.value / maxService) * 100}%` }}
                      />
                    </i>
                    <span>{formatCurrency(item.value)}</span>
                  </article>
                ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <Scissors />
              <h3>Sem produção no período</h3>
              <p>Conclua atendimentos para alimentar o relatório.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
