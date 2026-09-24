import { createService, toggleService, updateService } from "@/app/actions/business";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const membership = await requireOwner();
  const query = await searchParams;
  const supabase = await createClient();
  const { data: services } = await supabase.from("services").select("id,name,description,price_cents,default_duration_minutes,active").eq("business_id", membership.business_id).order("name");
  return <>
    <header className="page-header"><div><p className="eyebrow">Catálogo</p><h1>Serviços</h1><p className="muted">Desative em vez de apagar para preservar o histórico.</p></div></header>
    <Notice {...query} />
    <div className="split-grid"><section className="panel-card"><h2>Novo serviço</h2><form action={createService} className="form-stack compact">
      <label>Nome<input name="name" required /></label><label>Descrição<textarea name="description" rows={3} /></label>
      <div className="field-grid"><label>Preço (R$)<input name="price" type="number" min="0" step="0.01" required /></label><label>Duração (min)<input name="duration" type="number" min="5" max="720" step="5" required /></label></div>
      <SubmitButton>Criar serviço</SubmitButton></form></section>
      <section className="panel-card"><h2>Serviços cadastrados</h2>{!services?.length ? <p className="empty">Nenhum serviço cadastrado.</p> : <div className="list">{services.map((service) => <article className="team-card" key={service.id}><div className="list-row"><div><strong>{service.name}</strong><p>{formatCurrency(service.price_cents)} · {service.default_duration_minutes} min</p></div><form action={toggleService}><input type="hidden" name="id" value={service.id} /><input type="hidden" name="active" value={String(service.active)} /><button className="button-ghost">{service.active ? "Desativar" : "Ativar"}</button></form></div><details className="edit-details"><summary>Editar serviço</summary><form action={updateService} className="form-stack compact"><input type="hidden" name="id" value={service.id} /><label>Nome<input name="name" defaultValue={service.name} required /></label><label>Descrição<textarea name="description" defaultValue={service.description ?? ""} rows={2} /></label><div className="field-grid"><label>Preço (R$)<input name="price" type="number" min="0" step=".01" defaultValue={(service.price_cents / 100).toFixed(2)} required /></label><label>Duração<input name="duration" type="number" min="5" max="720" defaultValue={service.default_duration_minutes} required /></label></div><SubmitButton className="button-ghost">Salvar edição</SubmitButton></form></details></article>)}</div>}</section>
    </div>
  </>;
}
