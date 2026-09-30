import Link from "next/link";
import { ChevronRight, ContactRound, Search } from "lucide-react";
import { requireOperator } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const membership = await requireOperator();
  const params = await searchParams;
  const supabase = await createClient();
  const q = (params.q ?? "").trim();
  const sort = ["name", "recent", "visits"].includes(params.sort ?? "")
    ? params.sort!
    : "name";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 25;
  const { data, error } = await supabase.rpc("list_customers_summary", {
    p_search: q,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw new Error("Não foi possível carregar os clientes.");
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const customers = data ?? [];
  const total = Number(customers[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (target: number) => {
    const query = new URLSearchParams({ sort, page: String(target) });
    if (q) query.set("q", q);
    return `/painel/clientes?${query}`;
  };
  return (
    <>
      <header className="page-header premium">
        <div>
          <p className="eyebrow">Relacionamento</p>
          <h1>Clientes</h1>
          <p className="muted">
            Histórico, recorrência e próximos atendimentos em um só lugar.
          </p>
        </div>
        <Link className="button" href="/painel/agendamentos/novo">
          Novo agendamento
        </Link>
      </header>
      <form className="list-toolbar">
        <label>
          <Search size={17} />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Buscar nome ou telefone"
          />
        </label>
        <select name="sort" defaultValue={sort}>
          <option value="name">Nome A–Z</option>
          <option value="recent">Visita mais recente</option>
          <option value="visits">Mais atendimentos</option>
        </select>
        <button className="button-ghost">Aplicar</button>
      </form>
      <section className="data-card">
        {customers.length ? (
          <div className="customer-table">
            <div className="table-head">
              <span>Cliente</span>
              <span>Última visita</span>
              <span>Próximo horário</span>
              <span>Atendimentos</span>
              <span>Valor histórico</span>
              <span />
            </div>
            {customers.map((customer) => (
              <Link
                href={`/painel/clientes/${customer.id}`}
                className="table-row"
                key={customer.id}
              >
                <span className="customer-cell">
                  <b>{customer.name.slice(0, 1)}</b>
                  <span>
                    <strong>{customer.name}</strong>
                    <small>{formatPhone(customer.phone)}</small>
                  </span>
                </span>
                <span>
                  {customer.last_visit
                    ? formatDateTime(customer.last_visit, timezone)
                    : "Ainda não atendido"}
                </span>
                <span>
                  {customer.next_appointment
                    ? formatDateTime(customer.next_appointment, timezone)
                    : "Sem agendamento"}
                </span>
                <span>{customer.completed_visits}</span>
                <span>{formatCurrency(Number(customer.realized_value_cents))}</span>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ContactRound />
            <h2>Ainda não há clientes</h2>
            <p>Eles aparecerão automaticamente após o primeiro agendamento.</p>
            <Link href="/painel/agendamentos/novo" className="button">
              Novo agendamento
            </Link>
          </div>
        )}
      </section>
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Paginação de clientes">
          {page > 1 ? (
            <Link className="button-ghost" href={pageHref(page - 1)}>Anterior</Link>
          ) : <span />}
          <span>Página {page} de {totalPages} · {total} clientes</span>
          {page < totalPages ? (
            <Link className="button-ghost" href={pageHref(page + 1)}>Próxima</Link>
          ) : <span />}
        </nav>
      )}
    </>
  );
}
