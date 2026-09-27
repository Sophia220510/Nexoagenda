import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { FinanceTabs } from "@/components/finance-tabs";
import { requireOperator } from "@/lib/auth";
import { financialPeriod } from "@/lib/financial-period";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const methodLabels: Record<string, string> = {
  PIX: "PIX",
  CASH: "Dinheiro",
  DEBIT_CARD: "Débito",
  CREDIT_CARD: "Crédito",
  OTHER: "Outros",
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const membership = await requireOperator();
  const params = await searchParams;
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const range = financialPeriod(params.period, timezone);
  const supabase = await createClient();
  const [{ data: summaryData }, { data: payments }, { data: expenses }] =
    await Promise.all([
      supabase.rpc("get_financial_summary", {
        p_start: range.start.toISOString(),
        p_end: range.end.toISOString(),
      }),
      supabase
        .from("payments")
        .select(
          "id,amount_cents,method,paid_at,appointments(customers(name),appointment_items(service_name_snapshot))",
        )
        .eq("business_id", membership.business_id)
        .eq("status", "PAID")
        .gte("paid_at", range.start.toISOString())
        .lt("paid_at", range.end.toISOString())
        .order("paid_at", { ascending: false })
        .limit(40),
      supabase
        .from("expenses")
        .select("id,description,category,amount_cents,expense_date,created_at")
        .eq("business_id", membership.business_id)
        .eq("status", "ACTIVE")
        .gte("expense_date", range.start.toISOString().slice(0, 10))
        .lt("expense_date", range.end.toISOString().slice(0, 10))
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
  const summary = (summaryData ?? {}) as {
    scheduled_cents?: number;
    realized_cents?: number;
    received_cents?: number;
    expenses_cents?: number;
    commission_cents?: number;
    pending_appointments?: number;
    by_method?: Record<string, number>;
  };
  const pendingCents = Math.max(
    0,
    (summary.realized_cents ?? 0) - (summary.received_cents ?? 0),
  );
  const operational =
    (summary.received_cents ?? 0) -
    (summary.expenses_cents ?? 0) -
    (summary.commission_cents ?? 0);
  const movements = [
    ...(payments ?? []).map((item) => ({
      id: `p-${item.id}`,
      at: item.paid_at,
      type: "income" as const,
      title:
        (
          (
            item.appointments as unknown as {
              customers: { name: string };
              appointment_items: Array<{ service_name_snapshot: string }>;
            }
          )?.appointment_items ?? []
        )
          .map((service) => service.service_name_snapshot)
          .join(" + ") || "Atendimento",
      subtitle: (
        item.appointments as unknown as { customers: { name: string } }
      )?.customers?.name,
      amount: item.amount_cents,
      method: methodLabels[item.method],
    })),
    ...(expenses ?? []).map((item) => ({
      id: `e-${item.id}`,
      at: item.created_at,
      type: "expense" as const,
      title: item.description,
      subtitle: item.category,
      amount: item.amount_cents,
      method: "Despesa",
    })),
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 50);
  const maxMethod = Math.max(1, ...Object.values(summary.by_method ?? {}));

  return (
    <>
      <header className="page-header premium">
        <div>
          <p className="eyebrow">Gestão operacional</p>
          <h1>Financeiro</h1>
          <p className="muted">
            Separe o que foi agendado, realizado e realmente recebido.
          </p>
        </div>
        <Link className="button" href="/painel/financeiro/despesas">
          <Plus /> Registrar despesa
        </Link>
      </header>
      <FinanceTabs active="overview" />
      <form className="period-filter">
        <span>Período</span>
        {[
          ["today", "Hoje"],
          ["yesterday", "Ontem"],
          ["7d", "7 dias"],
          ["30d", "30 dias"],
          ["month", "Este mês"],
          ["previous_month", "Mês anterior"],
        ].map(([value, label]) => (
          <Link
            className={range.key === value ? "active" : ""}
            href={`/painel/financeiro?period=${value}`}
            key={value}
          >
            {label}
          </Link>
        ))}
      </form>
      {(summary.pending_appointments ?? 0) > 0 && (
        <div className="finance-alert">
          <AlertTriangle />
          <div>
            <strong>
              {summary.pending_appointments} atendimentos aguardando confirmação
            </strong>
            <span>
              Esses horários ainda não entram no realizado nem no recebido.
            </span>
          </div>
          <Link href="/painel/agendamentos">Resolver agora</Link>
        </div>
      )}
      <section className="finance-metrics">
        <article>
          <CalendarClock />
          <span>Valor agendado</span>
          <strong>{formatCurrency(summary.scheduled_cents ?? 0)}</strong>
          <small>Previsão, não é faturamento</small>
        </article>
        <article>
          <ReceiptText />
          <span>Valor realizado</span>
          <strong>{formatCurrency(summary.realized_cents ?? 0)}</strong>
          <small>Serviços confirmados</small>
        </article>
        <article className="is-positive">
          <Banknote />
          <span>Recebido</span>
          <strong>{formatCurrency(summary.received_cents ?? 0)}</strong>
          <small>Pagamentos confirmados</small>
        </article>
        <article className={pendingCents ? "is-warning" : ""}>
          <WalletCards />
          <span>Pendente</span>
          <strong>{formatCurrency(pendingCents)}</strong>
          <small>Realizado ainda não recebido</small>
        </article>
      </section>
      <div className="finance-columns">
        <section className="finance-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Entradas</p>
              <h2>Receita por método</h2>
            </div>
          </div>
          <div className="method-bars">
            {Object.entries(methodLabels).map(([method, label]) => {
              const value = summary.by_method?.[method] ?? 0;
              return (
                <div key={method}>
                  <span>{label}</span>
                  <i>
                    <b
                      style={{
                        width: `${Math.max(value ? 4 : 0, (value / maxMethod) * 100)}%`,
                      }}
                    />
                  </i>
                  <strong>{formatCurrency(value)}</strong>
                </div>
              );
            })}
          </div>
        </section>
        <section className="finance-panel operational-result">
          <p className="eyebrow">Resultado aproximado</p>
          <h2>{formatCurrency(operational)}</h2>
          <dl>
            <div>
              <dt>Receita recebida</dt>
              <dd>{formatCurrency(summary.received_cents ?? 0)}</dd>
            </div>
            <div>
              <dt>Despesas</dt>
              <dd>- {formatCurrency(summary.expenses_cents ?? 0)}</dd>
            </div>
            <div>
              <dt>Comissões</dt>
              <dd>- {formatCurrency(summary.commission_cents ?? 0)}</dd>
            </div>
          </dl>
          <small>
            Indicador operacional. Não substitui contabilidade oficial.
          </small>
        </section>
      </div>
      <section className="finance-panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">Caixa</p>
            <h2>Movimentações</h2>
          </div>
        </div>
        {movements.length ? (
          <div className="movement-list">
            {movements.map((movement) => (
              <article key={movement.id}>
                <span className={movement.type}>
                  {movement.type === "income" ? (
                    <ArrowUpRight />
                  ) : (
                    <ArrowDownRight />
                  )}
                </span>
                <time>{formatDateTime(movement.at, timezone)}</time>
                <div>
                  <strong>{movement.title}</strong>
                  <small>
                    {movement.subtitle} · {movement.method}
                  </small>
                </div>
                <b className={movement.type}>
                  {movement.type === "income" ? "+" : "-"}{" "}
                  {formatCurrency(movement.amount)}
                </b>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <ReceiptText />
            <h3>Nenhuma movimentação no período</h3>
            <p>Receitas aparecem após a confirmação dos atendimentos.</p>
          </div>
        )}
      </section>
    </>
  );
}
