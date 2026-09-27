import { BadgeDollarSign, CheckCircle2 } from "lucide-react";
import { markCommissionPaid, saveCommissionRule } from "@/app/actions/finance";
import { FinanceTabs } from "@/components/finance-tabs";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOperator } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const membership = await requireOperator();
  const owner = membership.role === "OWNER";
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const supabase = await createClient();
  const [
    { data: professionals },
    { data: services },
    { data: rules },
    { data: entries },
  ] = await Promise.all([
    supabase
      .from("professionals")
      .select("id,name")
      .eq("business_id", membership.business_id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("services")
      .select("id,name")
      .eq("business_id", membership.business_id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("professional_commission_rules")
      .select(
        "id,professional_id,service_id,type,value,professionals(name),services(name)",
      )
      .eq("business_id", membership.business_id)
      .eq("active", true),
    supabase
      .from("commission_entries")
      .select(
        "id,commission_cents,status,created_at,paid_at,professionals(name),appointments(customers(name))",
      )
      .eq("business_id", membership.business_id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const pending = (entries ?? []).filter((item) => item.status === "PENDING");
  const paid = (entries ?? []).filter((item) => item.status === "PAID");
  const pendingTotal = pending.reduce(
    (sum, item) => sum + item.commission_cents,
    0,
  );
  const paidTotal = paid.reduce((sum, item) => sum + item.commission_cents, 0);
  return (
    <>
      <header className="page-header premium">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1>Comissões</h1>
          <p className="muted">
            Regras transparentes, valores gerados no fechamento e histórico de
            pagamento.
          </p>
        </div>
      </header>
      <FinanceTabs active="commissions" />
      <Notice {...await searchParams} />
      <section className="finance-metrics compact-metrics">
        <article className="is-warning">
          <BadgeDollarSign />
          <span>A pagar</span>
          <strong>{formatCurrency(pendingTotal)}</strong>
          <small>{pending.length} lançamentos</small>
        </article>
        <article className="is-positive">
          <CheckCircle2 />
          <span>Já pago</span>
          <strong>{formatCurrency(paidTotal)}</strong>
          <small>{paid.length} lançamentos</small>
        </article>
      </section>
      <div className="finance-columns">
        {owner && (
          <section className="finance-panel">
            <h2>Configurar regra</h2>
            <p className="muted">
              Uma regra por serviço substitui a regra geral do profissional.
            </p>
            <form action={saveCommissionRule} className="form-stack">
              <label>
                Profissional
                <select name="professional_id" required>
                  <option value="">Selecione</option>
                  {professionals?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Serviço
                <select name="service_id">
                  <option value="">Regra geral</option>
                  {services?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-grid">
                <label>
                  Tipo
                  <select name="type">
                    <option value="PERCENTAGE">Percentual</option>
                    <option value="FIXED">Valor fixo</option>
                  </select>
                </label>
                <label>
                  Valor
                  <input
                    name="value"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                  />
                </label>
              </div>
              <SubmitButton>Salvar regra</SubmitButton>
            </form>
            <div className="rule-list">
              {rules?.map((rule) => (
                <article key={rule.id}>
                  <span>
                    <strong>
                      {
                        (rule.professionals as unknown as { name: string })
                          ?.name
                      }
                    </strong>
                    <small>
                      {(rule.services as unknown as { name: string } | null)
                        ?.name ?? "Todos os serviços"}
                    </small>
                  </span>
                  <b>
                    {rule.type === "PERCENTAGE"
                      ? `${rule.value / 100}%`
                      : formatCurrency(rule.value)}
                  </b>
                </article>
              ))}
            </div>
          </section>
        )}
        <section className="finance-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Lançamentos</p>
              <h2>Histórico</h2>
            </div>
          </div>
          {entries?.length ? (
            <div className="commission-list">
              {entries.map((entry) => {
                const professional = entry.professionals as unknown as {
                  name: string;
                };
                const appointment = entry.appointments as unknown as {
                  customers: { name: string };
                };
                return (
                  <article key={entry.id}>
                    <div>
                      <strong>{professional?.name}</strong>
                      <small>
                        {appointment?.customers?.name} ·{" "}
                        {formatDateTime(entry.created_at, timezone)}
                      </small>
                    </div>
                    <b>{formatCurrency(entry.commission_cents)}</b>
                    <span
                      className={`status-pill status-${entry.status.toLowerCase()}`}
                    >
                      {entry.status === "PAID" ? "Pago" : "Pendente"}
                    </span>
                    {owner && entry.status === "PENDING" && (
                      <form action={markCommissionPaid}>
                        <input
                          type="hidden"
                          name="commission_id"
                          value={entry.id}
                        />
                        <button className="button-ghost">Marcar paga</button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state compact">
              <BadgeDollarSign />
              <h3>Nenhuma comissão gerada</h3>
              <p>As comissões aparecem quando um atendimento é concluído.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
