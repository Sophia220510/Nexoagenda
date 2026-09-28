/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type BusinessOverview = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  logo_url: string | null;
  business_type: string;
  active: boolean;
  created_at: string;
  professional_count: number;
  customer_count: number;
  appointment_count: number;
};

export default async function AdminBusinessesPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_business_overview");
  const businesses = (Array.isArray(data) ? data : []) as BusinessOverview[];
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Plataforma</p>
          <h1>Estabelecimentos</h1>
          <p className="muted">
            Abra uma empresa para consultar e editar seus dados.
          </p>
        </div>
        <Link className="button" href="/admin/empresas/nova">
          Novo estabelecimento
        </Link>
      </header>
      <section className="panel-card">
        <div className="list">
          {businesses.map((business) => (
            <Link
              className="list-row"
              href={`/admin/empresas/${business.id}`}
              key={business.id}
            >
              <div className="business-list-identity">
                {business.logo_url ? (
                  <img src={business.logo_url} alt="" />
                ) : (
                  <span>{business.name.slice(0, 1)}</span>
                )}
                <div>
                  <strong>{business.name}</strong>
                  <p>
                    {business.business_type} · /{business.slug} ·{" "}
                    {business.phone}
                  </p>
                </div>
              </div>
              <div className="align-right">
                <span>{business.active ? "Ativa" : "Inativa"}</span>
                <small>
                  {business.professional_count} profissionais ·{" "}
                  {business.customer_count} clientes ·{" "}
                  {business.appointment_count} agendamentos
                </small>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
