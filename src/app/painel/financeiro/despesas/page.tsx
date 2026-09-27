import { ReceiptText } from "lucide-react";
import { recordExpense } from "@/app/actions/finance";
import { FinanceTabs } from "@/components/finance-tabs";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOperator } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const categoryLabels: Record<string, string> = {
  MATERIAL: "Material",
  RENT: "Aluguel",
  PRODUCTS: "Produtos",
  MARKETING: "Marketing",
  MAINTENANCE: "Manutenção",
  SALARIES: "Salários",
  OTHER: "Outros",
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const membership = await requireOperator();
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("id,description,category,amount_cents,expense_date,notes")
    .eq("business_id", membership.business_id)
    .eq("status", "ACTIVE")
    .order("expense_date", { ascending: false })
    .limit(100);
  return (
    <>
      <header className="page-header premium">
        <div>
          <p className="eyebrow">Financeiro</p>
          <h1>Despesas</h1>
          <p className="muted">
            Controle operacional de saídas, sem misturar com contabilidade
            fiscal.
          </p>
        </div>
      </header>
      <FinanceTabs active="expenses" />
      <Notice {...await searchParams} />
      <div className="finance-columns">
        <section className="finance-panel">
          <h2>Registrar despesa</h2>
          <form action={recordExpense} className="form-stack">
            <label>
              Descrição
              <input
                name="description"
                minLength={2}
                maxLength={160}
                required
              />
            </label>
            <div className="field-grid">
              <label>
                Categoria
                <select name="category">
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor (R$)
                <input
                  name="amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  required
                />
              </label>
              <label>
                Data
                <input
                  type="date"
                  name="expense_date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  required
                />
              </label>
              <label>
                Forma
                <select name="method">
                  <option value="">Não informada</option>
                  <option value="PIX">PIX</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="DEBIT_CARD">Débito</option>
                  <option value="CREDIT_CARD">Crédito</option>
                  <option value="OTHER">Outro</option>
                </select>
              </label>
            </div>
            <label>
              Observação
              <textarea name="notes" maxLength={1000} rows={3} />
            </label>
            <SubmitButton>Registrar despesa</SubmitButton>
          </form>
        </section>
        <section className="finance-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Histórico</p>
              <h2>Últimas despesas</h2>
            </div>
          </div>
          {data?.length ? (
            <div className="expense-list">
              {data.map((expense) => (
                <article key={expense.id}>
                  <span>
                    <strong>{expense.description}</strong>
                    <small>
                      {categoryLabels[expense.category]} ·{" "}
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(`${expense.expense_date}T12:00:00`),
                      )}
                    </small>
                  </span>
                  <b>- {formatCurrency(expense.amount_cents)}</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <ReceiptText />
              <h3>Nenhuma despesa registrada</h3>
              <p>Use o formulário para registrar a primeira saída.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
