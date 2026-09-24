import Link from "next/link";
import { createProfessional, toggleProfessional, updateProfessional } from "@/app/actions/business";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessionalsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const membership = await requireOwner(); const supabase = await createClient();
  const [professionalsResult, servicesResult] = await Promise.all([
    supabase.from("professionals").select("id,name,photo_url,bio,active,user_id,setup_completed_at,professional_services(service_id,active)").eq("business_id", membership.business_id).order("name"),
    supabase.from("services").select("id,name").eq("business_id", membership.business_id).eq("active", true).order("name"),
  ]);
  const professionals = professionalsResult.data ?? []; const services = servicesResult.data ?? [];
  return <><header className="page-header"><div><p className="eyebrow">Equipe</p><h1>Profissionais</h1><p className="muted">Cadastre a equipe e configure agendas individuais.</p></div></header><Notice {...await searchParams} />
    <div className="split-grid"><section className="panel-card"><h2>Novo profissional</h2><form action={createProfessional} className="form-stack compact"><label>Nome<input name="name" required /></label><label>URL da foto (opcional)<input name="photo_url" type="url" /></label><label>Bio<textarea name="bio" rows={3} /></label><fieldset><legend>Serviços executados</legend>{services.map((service) => <label className="check" key={service.id}><input type="checkbox" name="service_ids" value={service.id} />{service.name}</label>)}</fieldset><SubmitButton>Adicionar profissional</SubmitButton></form></section>
      <section className="panel-card"><h2>Equipe cadastrada</h2>{!professionals.length ? <p className="empty">Nenhum profissional cadastrado.</p> : <div className="list">{professionals.map((professional) => { const selected = (professional.professional_services as Array<{ service_id: string; active: boolean }>).filter((item) => item.active).map((item) => item.service_id); return <article className="team-card" key={professional.id}><div className="list-row"><div><strong>{professional.name}</strong><p>{professional.user_id ? "Com acesso ao painel" : "Sem login"} · {professional.setup_completed_at ? "agenda configurada" : "configuração pendente"}</p></div><div className="card-actions"><Link className="button-ghost" href={`/painel/profissionais/${professional.id}`}>Configurar agenda</Link><form action={toggleProfessional}><input type="hidden" name="id" value={professional.id} /><input type="hidden" name="active" value={String(professional.active)} /><button className="button-ghost">{professional.active ? "Desativar" : "Ativar"}</button></form></div></div><details className="edit-details"><summary>Editar perfil e serviços</summary><form action={updateProfessional} className="form-stack compact"><input type="hidden" name="id" value={professional.id} /><label>Nome<input name="name" defaultValue={professional.name} required /></label><label>URL da foto<input name="photo_url" type="url" defaultValue={professional.photo_url ?? ""} /></label><label>Bio<textarea name="bio" defaultValue={professional.bio ?? ""} rows={2} /></label><fieldset><legend>Serviços</legend>{services.map((service) => <label className="check" key={service.id}><input type="checkbox" name="service_ids" value={service.id} defaultChecked={selected.includes(service.id)} />{service.name}</label>)}</fieldset><SubmitButton className="button-ghost">Salvar edição</SubmitButton></form></details></article>; })}</div>}</section></div>
  </>;
}
