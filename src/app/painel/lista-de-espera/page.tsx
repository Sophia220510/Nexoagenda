import { Clock3, PhoneCall } from "lucide-react";
import {
  createWaitlistEntry,
  updateWaitlistStatus,
} from "@/app/actions/waitlist";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOperator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const periodLabel: Record<string, string> = {
  ANY: "Qualquer horário",
  MORNING: "Manhã",
  AFTERNOON: "Tarde",
  EVENING: "Noite",
};
const statusLabel: Record<string, string> = {
  WAITING: "Aguardando",
  CONTACTED: "Contatado",
  BOOKED: "Agendado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const membership = await requireOperator();
  const supabase = await createClient();
  const [{ data: entries }, { data: services }, { data: professionals }] =
    await Promise.all([
      supabase
        .from("waitlist_entries")
        .select(
          "id,preferred_date,period,status,notes,created_at,customers(name,phone),services(name),professionals(name)",
        )
        .eq("business_id", membership.business_id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("services")
        .select("id,name")
        .eq("business_id", membership.business_id)
        .eq("active", true)
        .order("name"),
      supabase
        .from("professionals")
        .select("id,name")
        .eq("business_id", membership.business_id)
        .eq("active", true)
        .order("name"),
    ]);
  return (
    <>
      <header className="page-header premium">
        <div>
          <p className="eyebrow">Oportunidades</p>
          <h1>Lista de espera</h1>
          <p className="muted">
            Organize clientes interessados e preencha horários que forem
            liberados.
          </p>
        </div>
      </header>
      <Notice {...await searchParams} />
      <div className="finance-columns">
        <section className="finance-panel">
          <h2>Adicionar cliente</h2>
          <form action={createWaitlistEntry} className="form-stack">
            <div className="field-grid">
              <label>
                Nome
                <input name="customer_name" required />
              </label>
              <label>
                Telefone
                <input name="customer_phone" inputMode="tel" required />
              </label>
              <label>
                Serviço
                <select name="service_id" required>
                  <option value="">Qualquer serviço</option>
                  {services?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Profissional
                <select name="professional_id">
                  <option value="">Qualquer profissional</option>
                  {professionals?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data preferida
                <input type="date" name="preferred_date" required />
              </label>
              <label>
                Período
                <select name="preferred_period">
                  {Object.entries(periodLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Observações
              <textarea name="notes" rows={3} />
            </label>
            <SubmitButton>Adicionar à lista</SubmitButton>
          </form>
        </section>
        <section className="finance-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Fila ativa</p>
              <h2>Clientes interessados</h2>
            </div>
          </div>
          {entries?.length ? (
            <div className="waitlist-list">
              {entries.map((entry) => (
                <article key={entry.id}>
                  <span className="waitlist-icon">
                    <Clock3 />
                  </span>
                  <div>
                    <strong>
                      {(entry.customers as unknown as { name: string })?.name}
                    </strong>
                    <small>
                      {(entry.services as unknown as { name: string } | null)
                        ?.name ?? "Qualquer serviço"}{" "}
                      ·{" "}
                      {(
                        entry.professionals as unknown as {
                          name: string;
                        } | null
                      )?.name ?? "Qualquer profissional"}
                    </small>
                    <small>
                      {entry.preferred_date
                        ? new Intl.DateTimeFormat("pt-BR").format(
                            new Date(`${entry.preferred_date}T12:00:00`),
                          )
                        : "Data flexível"}{" "}
                      · {periodLabel[entry.period]}
                    </small>
                  </div>
                  <a
                    href={`tel:${(entry.customers as unknown as { phone: string })?.phone}`}
                    className="button-ghost"
                  >
                    <PhoneCall />
                    {(entry.customers as unknown as { phone: string })?.phone}
                  </a>
                  <form action={updateWaitlistStatus}>
                    <input type="hidden" name="entry_id" value={entry.id} />
                    <select name="status" defaultValue={entry.status}>
                      {Object.entries(statusLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button className="button-ghost">Atualizar</button>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <Clock3 />
              <h3>Lista vazia</h3>
              <p>Novos interessados aparecerão aqui.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
