import Link from "next/link";
import {
  createProfessional,
  toggleProfessional,
  updateProfessional,
} from "@/app/actions/business";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { AdminImageUpload } from "@/components/admin-image-upload";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const membership = await requireOwner();
  const supabase = await createClient();
  const [professionalsResult, servicesResult] = await Promise.all([
    supabase
      .from("professionals")
      .select(
        "id,name,photo_url,bio,phone,whatsapp_phone,receive_booking_whatsapp,active,user_id,setup_completed_at,financial_model,payment_receiver,professional_services(service_id,active)",
      )
      .eq("business_id", membership.business_id)
      .order("name"),
    supabase
      .from("services")
      .select("id,name")
      .eq("business_id", membership.business_id)
      .eq("active", true)
      .order("name"),
  ]);
  const professionals = professionalsResult.data ?? [];
  const services = servicesResult.data ?? [];
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Equipe</p>
          <h1>Equipe</h1>
          <p className="muted">
            Cadastre a equipe e configure agendas individuais.
          </p>
        </div>
      </header>
      <nav className="view-tabs" aria-label="Seções da equipe">
        <Link className="active" href="/painel/equipe">Visão geral</Link>
        <Link href="/painel/equipe">Profissionais</Link>
        <Link href="/painel/agenda?professional=all">Agenda</Link>
        <Link href="/painel/relatorios">Produção</Link>
        <Link href="/painel/financeiro/comissoes">Repasses</Link>
      </nav>
      <Notice {...await searchParams} />
      <div className="split-grid">
        <section className="panel-card">
          <h2>Novo profissional</h2>
          <form action={createProfessional} className="form-stack compact">
            <label>
              Nome
              <input name="name" required />
            </label>
            <AdminImageUpload
              label="Foto do profissional"
              scope="profiles"
              name="photo_url"
              endpoint="/api/upload"
            />
            <label>
              Bio
              <textarea name="bio" rows={3} />
            </label>
            <div className="field-grid">
              <label>Telefone<input name="phone" inputMode="tel" placeholder="(11) 99999-9999" /></label>
              <label>WhatsApp<input name="whatsapp_phone" inputMode="tel" placeholder="(11) 99999-9999" /></label>
            </div>
            <label className="check"><input type="checkbox" name="receive_booking_whatsapp" /> Direcionar o aviso manual do cliente para este WhatsApp</label>
            <fieldset>
              <legend>Serviços executados</legend>
              {services.map((service) => (
                <label className="check" key={service.id}>
                  <input
                    type="checkbox"
                    name="service_ids"
                    value={service.id}
                  />
                  {service.name}
                </label>
              ))}
            </fieldset>
            <SubmitButton>Adicionar profissional</SubmitButton>
          </form>
        </section>
        <section className="panel-card">
          <h2>Equipe cadastrada</h2>
          {!professionals.length ? (
            <p className="empty">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="list">
              {professionals.map((professional) => {
                const selected = (
                  professional.professional_services as Array<{
                    service_id: string;
                    active: boolean;
                  }>
                )
                  .filter((item) => item.active)
                  .map((item) => item.service_id);
                return (
                  <article className="team-card" key={professional.id}>
                    <div className="list-row">
                      <div>
                        <strong>{professional.name}</strong>
                        <p>
                          {professional.user_id
                            ? "Com acesso ao painel"
                            : "Sem login"}{" "}
                          ·{" "}
                          {professional.setup_completed_at
                            ? "agenda configurada"
                            : "configuração pendente"}
                        </p>
                        <small>{professional.financial_model.replaceAll("_", " ")} · recebe: {professional.payment_receiver === "BUSINESS" ? "empresa" : "profissional"}</small>
                      </div>
                      <div className="card-actions">
                        <Link
                          className="button-ghost"
                          href={`/painel/equipe/${professional.id}`}
                        >
                          Configurar agenda
                        </Link>
                        <form action={toggleProfessional}>
                          <input
                            type="hidden"
                            name="id"
                            value={professional.id}
                          />
                          <input
                            type="hidden"
                            name="active"
                            value={String(professional.active)}
                          />
                          <button className="button-ghost">
                            {professional.active ? "Desativar" : "Ativar"}
                          </button>
                        </form>
                      </div>
                    </div>
                    <details className="edit-details">
                      <summary>Editar perfil e serviços</summary>
                      <form
                        action={updateProfessional}
                        className="form-stack compact"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={professional.id}
                        />
                        <label>
                          Nome
                          <input
                            name="name"
                            defaultValue={professional.name}
                            required
                          />
                        </label>
                        <AdminImageUpload
                          label="Foto do profissional"
                          scope="profiles"
                          name="photo_url"
                          defaultValue={professional.photo_url ?? ""}
                          endpoint="/api/upload"
                        />
                        <label>
                          Bio
                          <textarea
                            name="bio"
                            defaultValue={professional.bio ?? ""}
                            rows={2}
                          />
                        </label>
                        <div className="field-grid">
                          <label>Telefone<input name="phone" inputMode="tel" defaultValue={professional.phone ?? ""} /></label>
                          <label>WhatsApp<input name="whatsapp_phone" inputMode="tel" defaultValue={professional.whatsapp_phone ?? ""} /></label>
                        </div>
                        <label className="check"><input type="checkbox" name="receive_booking_whatsapp" defaultChecked={professional.receive_booking_whatsapp} /> Direcionar o aviso manual do cliente para este WhatsApp</label>
                        <fieldset>
                          <legend>Serviços</legend>
                          {services.map((service) => (
                            <label className="check" key={service.id}>
                              <input
                                type="checkbox"
                                name="service_ids"
                                value={service.id}
                                defaultChecked={selected.includes(service.id)}
                              />
                              {service.name}
                            </label>
                          ))}
                        </fieldset>
                        <SubmitButton className="button-ghost">
                          Salvar edição
                        </SubmitButton>
                      </form>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
