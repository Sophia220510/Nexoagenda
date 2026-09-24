import { createClient } from "@/lib/supabase/server";

export default async function AdminProfessionalsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("professionals").select("id,name,active,setup_completed_at,businesses(name)").order("created_at", { ascending: false });
  return <><header className="page-header"><div><p className="eyebrow">Plataforma</p><h1>Profissionais</h1></div></header><section className="panel-card"><div className="list">{(data ?? []).map((professional) => <article className="list-row" key={professional.id}><div><strong>{professional.name}</strong><p>{(professional.businesses as unknown as { name: string } | null)?.name}</p></div><div className="align-right"><span>{professional.active ? "Ativo" : "Inativo"}</span><small>{professional.setup_completed_at ? "Agenda configurada" : "Configuração pendente"}</small></div></article>)}</div></section></>;
}
