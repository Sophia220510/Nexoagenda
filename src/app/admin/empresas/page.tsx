/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBusinessesPage() {
  const supabase = await createClient();
  const [businessesResult, professionalsResult, customersResult, appointmentsResult] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,phone,logo_url,business_type,active,created_at").order("created_at", { ascending: false }),
    supabase.from("professionals").select("business_id"), supabase.from("customers").select("business_id"), supabase.from("appointments").select("business_id"),
  ]);
  const count = (rows: Array<{ business_id: string }> | null, id: string) => (rows ?? []).filter((row) => row.business_id === id).length;
  return <><header className="page-header"><div><p className="eyebrow">Plataforma</p><h1>Estabelecimentos</h1><p className="muted">Abra uma empresa para consultar e editar seus dados.</p></div><Link className="button" href="/admin/empresas/nova">Novo estabelecimento</Link></header><section className="panel-card"><div className="list">{(businessesResult.data ?? []).map((business) => <Link className="list-row" href={`/admin/empresas/${business.id}`} key={business.id}><div className="business-list-identity">{business.logo_url ? <img src={business.logo_url} alt="" /> : <span>{business.name.slice(0,1)}</span>}<div><strong>{business.name}</strong><p>{business.business_type} · /{business.slug} · {business.phone}</p></div></div><div className="align-right"><span>{business.active ? "Ativa" : "Inativa"}</span><small>{count(professionalsResult.data, business.id)} profissionais · {count(customersResult.data, business.id)} clientes · {count(appointmentsResult.data, business.id)} agendamentos</small></div></Link>)}</div></section></>;
}
