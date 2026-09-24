import { createClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id,name,phone,created_at,businesses(name)").order("created_at", { ascending: false }).limit(250);
  return <><header className="page-header"><div><p className="eyebrow">Plataforma</p><h1>Clientes</h1><p className="muted">Visão global, limitada a dados operacionais essenciais.</p></div></header><section className="panel-card"><div className="list">{(data ?? []).map((customer) => <article className="list-row" key={customer.id}><div><strong>{customer.name}</strong><p>{customer.phone}</p></div><span>{(customer.businesses as unknown as { name: string } | null)?.name}</span></article>)}</div></section></>;
}
