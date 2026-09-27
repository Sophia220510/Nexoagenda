import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/types/domain";

const PAGE_SIZE = 50;
const validStatuses: AppointmentStatus[] = [
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];
const labels: Record<AppointmentStatus, string> = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

type SearchParams = { q?: string; status?: string; page?: string };

function pageHref(params: SearchParams, page: number) {
  const next = new URLSearchParams();
  if (params.q?.trim()) next.set("q", params.q.trim());
  if (params.status) next.set("status", params.status);
  next.set("page", String(page));
  return `/painel/agendamentos?${next.toString()}`;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const membership = await requireOwner();
  const params = await searchParams;
  const supabase = await createClient();
  const q = (params.q ?? "").trim().slice(0, 80);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const status = validStatuses.includes(params.status as AppointmentStatus)
    ? (params.status as AppointmentStatus)
    : null;

  let customerIds: string[] = [];
  let serviceIds: string[] = [];
  if (q) {
    const pattern = `%${q}%`;
    const [customers, services] = await Promise.all([
      supabase
        .from("customers")
        .select("id")
        .eq("business_id", membership.business_id)
        .ilike("name", pattern)
        .limit(500),
      supabase
        .from("services")
        .select("id")
        .eq("business_id", membership.business_id)
        .ilike("name", pattern)
        .limit(500),
    ]);
    customerIds = (customers.data ?? []).map((item) => item.id);
    serviceIds = (services.data ?? []).map((item) => item.id);
  }

  let query = supabase
    .from("appointments")
    .select(
      "id,starts_at,status,price_cents_snapshot,customers(name,phone),services(name,price_cents),professionals(name)",
      { count: "exact" },
    )
    .eq("business_id", membership.business_id)
    .order("starts_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (q) {
    const clauses = [
      customerIds.length ? `customer_id.in.(${customerIds.join(",")})` : "",
      serviceIds.length ? `service_id.in.(${serviceIds.join(",")})` : "",
    ].filter(Boolean);
    query = clauses.length
      ? query.or(clauses.join(","))
      : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";

  return (
    <>
      <header className="page-header premium">
        <div>
          <p className="eyebrow">Operação</p>
          <h1>Agendamentos</h1>
          <p className="muted">
            Consulte, atualize e acompanhe todos os atendimentos.
          </p>
        </div>
        <Link className="button" href="/painel/agendamentos/novo">
          <CalendarPlus size={18} /> Novo agendamento
        </Link>
      </header>

      <form className="list-toolbar">
        <label>
          <Search size={17} />
          <input
            name="q"
            defaultValue={params.q}
            maxLength={80}
            placeholder="Buscar cliente ou serviço"
          />
        </label>
        <select name="status" defaultValue={status ?? ""}>
          <option value="">Todos os status</option>
          {Object.entries(labels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="button-ghost">Filtrar</button>
      </form>

      <section className="data-card">
        {rows.length ? (
          <div className="appointment-list">
            {rows.map((item) => {
              const customer = item.customers as unknown as {
                name: string;
                phone: string;
              };
              const service = item.services as unknown as {
                name: string;
                price_cents: number;
              };
              const professional = item.professionals as unknown as {
                name: string;
              };
              return (
                <Link
                  href={`/painel/agendamentos/${item.id}`}
                  className="appointment-row"
                  key={item.id}
                >
                  <time>{formatDateTime(item.starts_at, timezone)}</time>
                  <div>
                    <strong>{customer?.name}</strong>
                    <small>
                      {service?.name} · {professional?.name}
                    </small>
                  </div>
                  <span
                    className={`status-pill status-${item.status.toLowerCase()}`}
                  >
                    {labels[item.status]}
                  </span>
                  <b>
                    {formatCurrency(
                      item.price_cents_snapshot ?? service?.price_cents ?? 0,
                    )}
                  </b>
                  <ChevronRight size={18} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <CalendarPlus />
            <h2>Nenhum agendamento encontrado</h2>
            <p>Altere os filtros ou crie um novo atendimento.</p>
            <Link className="button" href="/painel/agendamentos/novo">
              Criar agendamento
            </Link>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Paginação dos agendamentos">
          {page > 1 ? (
            <Link href={pageHref(params, page - 1)}>
              <ChevronLeft size={17} /> Anterior
            </Link>
          ) : (
            <span aria-disabled="true">
              <ChevronLeft size={17} /> Anterior
            </span>
          )}
          <p>
            Página <strong>{page}</strong> de {totalPages} · {total} registros
          </p>
          {page < totalPages ? (
            <Link href={pageHref(params, page + 1)}>
              Próxima <ChevronRight size={17} />
            </Link>
          ) : (
            <span aria-disabled="true">
              Próxima <ChevronRight size={17} />
            </span>
          )}
        </nav>
      )}
    </>
  );
}
