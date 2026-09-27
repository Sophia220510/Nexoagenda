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
            <legend>Lembretes por WhatsApp</legend>
            <p className="muted">
              A fila fica preparada, mas nenhuma mensagem é marcada como enviada
              sem um provedor configurado.
            </p>
            <label className="check">
              <input
                type="checkbox"
                name="reminders_enabled"
                defaultChecked={business.reminders_enabled}
              />{" "}
              Ativar automação
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="reminder_24h_enabled"
                defaultChecked={business.reminder_24h_enabled}
              />{" "}
              Lembrete 24 horas antes
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="reminder_2h_enabled"
                defaultChecked={business.reminder_2h_enabled}
              />{" "}
              Lembrete 2 horas antes
            </label>
            <label>
              Mensagem
              <textarea
                name="reminder_template"
                rows={3}
                defaultValue={
                  business.reminder_template ??
                  "Olá, {cliente}! Lembrando do seu horário em {data} às {hora}."
                }
              />
            </label>
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
