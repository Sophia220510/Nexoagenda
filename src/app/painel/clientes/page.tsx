import { requireOwner } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const membership = await requireOwner(); const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id,name,phone,created_at").eq("business_id", membership.business_id).order("name");
  return <><header className="page-header"><div><p className="eyebrow">Relacionamento</p><h1>Clientes</h1></div></header><section className="panel-card">{!data?.length ? <p className="empty">Os clientes aparecerão aqui após o primeiro agendamento.</p> : <div className="list">{data.map((customer) => <article className="list-row" key={customer.id}><strong>{customer.name}</strong><span>{formatPhone(customer.phone)}</span></article>)}</div>}</section></>;
}

