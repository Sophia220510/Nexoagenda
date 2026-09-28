import Link from "next/link";
import { updateBusiness } from "@/app/actions/business";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const membership = await requireOwner();
  const query = await searchParams;
  const business = membership.businesses;
  if (!business) return null;
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Empresa</p>
          <h1>Configurações</h1>
        </div>
        <Link className="button-ghost" href={`/${business.slug}`}>
          Ver página pública
        </Link>
      </header>
      <section className="panel-card form-card">
        <Notice {...query} />
        <form action={updateBusiness} className="form-stack">
          <label>
            Nome
            <input name="name" defaultValue={business.name} required />
          </label>
          <label>
            Slug
            <input value={business.slug} disabled />
            <small>O slug não pode ser alterado nesta fase.</small>
          </label>
          <label>
            WhatsApp
            <input name="phone" defaultValue={business.phone} required />
          </label>
          <label>
            URL do logo
            <input
              name="logo_url"
              type="url"
              defaultValue={business.logo_url ?? ""}
            />
          </label>
          <label>
            Fuso horário
            <input name="timezone" defaultValue={business.timezone} required />
          </label>
          <div className="field-grid">
            <label>
              Como você trabalha?
              <select name="business_mode" defaultValue={business.business_mode ?? "TEAM"}>
                <option value="SOLO">Trabalho sozinho</option>
                <option value="TEAM">Tenho uma equipe</option>
              </select>
            </label>
            <label>
              Intervalo da agenda
              <select name="slot_interval_minutes" defaultValue={business.slot_interval_minutes ?? 15}>
                <option value="5">5 minutos</option>
                <option value="10">10 minutos</option>
                <option value="15">15 minutos</option>
                <option value="20">20 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">60 minutos</option>
              </select>
            </label>
          </div>
          <label>
            Descrição pública
            <textarea
              name="description"
              rows={3}
              maxLength={1000}
              defaultValue={business.description ?? ""}
            />
          </label>
          <div className="field-grid">
            <label>
              Endereço
              <input name="address" defaultValue={business.address ?? ""} />
            </label>
            <label>
              Instagram
              <input
                name="instagram_url"
                type="url"
                defaultValue={business.instagram_url ?? ""}
              />
            </label>
          </div>
          <fieldset className="settings-group">
            <legend>Formas de pagamento e taxas</legend>
            <p className="muted">Marque o que você aceita. Taxas são opcionais e começam em 0%.</p>
            <div className="field-grid">
              {[
                ["PIX", "PIX"], ["CASH", "Dinheiro"], ["DEBIT_CARD", "Débito"],
                ["CREDIT_CARD", "Crédito"], ["OTHER", "Outro"],
              ].map(([value, label]) => (
                <label className="check" key={value}><input type="checkbox" name="accepted_payment_methods" value={value} defaultChecked={(business.accepted_payment_methods ?? ["PIX","CASH","DEBIT_CARD","CREDIT_CARD","OTHER"]).includes(value as never)} /> {label}</label>
              ))}
            </div>
            <div className="field-grid">
              <label>Taxa débito (%)<input name="fee_debit" type="number" min="0" max="100" step="0.01" defaultValue={Number(business.payment_fee_bps?.DEBIT_CARD ?? 0) / 100} /></label>
              <label>Taxa crédito (%)<input name="fee_credit" type="number" min="0" max="100" step="0.01" defaultValue={Number(business.payment_fee_bps?.CREDIT_CARD ?? 0) / 100} /></label>
            </div>
          </fieldset>
          <fieldset className="settings-group">
            <legend>Notificações no site</legend>
            <p className="muted">
              Agendamentos, alterações, bloqueios e atividades importantes aparecem
              na central de notificações do painel.
            </p>
            <span className="status-active">Ativas para esta empresa</span>
          </fieldset>
          <label className="check">
            <input
              type="checkbox"
              name="professionals_can_view_commission"
              defaultChecked={business.professionals_can_view_commission}
            />{" "}
            Profissionais podem ver as próprias comissões
          </label>
          <SubmitButton>Salvar configurações</SubmitButton>
        </form>
      </section>
    </>
  );
}
