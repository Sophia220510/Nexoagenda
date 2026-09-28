import { notFound } from "next/navigation";
import Link from "next/link";
import { updateProfessionalFinancialModel } from "@/app/actions/finance";
import { Notice } from "@/components/notice";
import { ProfessionalSetupWizard } from "@/components/professional-setup-wizard";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessionalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ professionalId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const membership = await requireOwner();
  const { professionalId } = await params;
  const supabase = await createClient();
  const [professionalResult, services, assigned, hours, blocks, commissions] =
    await Promise.all([
      supabase
        .from("professionals")
        .select("id,name,business_id,phone,whatsapp_phone,active,user_id,financial_model,financial_value,payment_receiver,pix_key")
        .eq("id", professionalId)
        .eq("business_id", membership.business_id)
        .maybeSingle(),
      supabase
        .from("services")
        .select("id,name,default_duration_minutes")
        .eq("business_id", membership.business_id)
        .eq("active", true)
        .order("name"),
      supabase
        .from("professional_services")
        .select("service_id,duration_override_minutes,active")
        .eq("professional_id", professionalId),
      supabase
        .from("working_hours")
        .select("weekday,start_time,end_time")
        .eq("professional_id", professionalId)
        .eq("active", true),
      supabase
        .from("recurring_blocks")
        .select("weekday,start_time,end_time,reason")
        .eq("professional_id", professionalId)
        .eq("active", true),
      supabase
        .from("commission_entries")
        .select("commission_cents,status,production_cents")
        .eq("professional_id", professionalId),
    ]);
  if (!professionalResult.data) notFound();
  const professional = professionalResult.data;
  const production = (commissions.data ?? []).reduce((sum, item) => sum + item.production_cents, 0);
  const generated = (commissions.data ?? []).filter((item) => item.status !== "VOIDED").reduce((sum, item) => sum + item.commission_cents, 0);
  const paid = (commissions.data ?? []).filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.commission_cents, 0);
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Configuração profissional</p>
          <h1>{professional.name}</h1>
          <p className="muted">
            Defina serviços, duração individual, jornada e pausas fixas.
          </p>
        </div>
      </header>
      <nav className="view-tabs" aria-label="Perfil profissional">
        <Link href="/painel/equipe">Equipe</Link>
        <Link className="active" href={`/painel/equipe/${professionalId}`}>Perfil</Link>
        <a href="#servicos">Serviços</a>
        <a href="#agenda">Agenda</a>
        <a href="#financeiro">Financeiro</a>
        <a href="#acesso">Acesso</a>
      </nav>
      <Notice {...await searchParams} />
      <section className="metric-grid" id="financeiro">
        <article><span>Produção histórica</span><strong>{formatCurrency(production)}</strong><small>Serviços concluídos</small></article>
        <article><span>Repasse gerado</span><strong>{formatCurrency(generated)}</strong><small>Total calculado</small></article>
        <article><span>Repasse pago</span><strong>{formatCurrency(paid)}</strong><small>Efetivamente pago</small></article>
        <article><span>Repasse pendente</span><strong>{formatCurrency(Math.max(0, generated - paid))}</strong><small>Aguardando pagamento</small></article>
      </section>
      <div className="split-grid">
        <section className="panel-card" id="agenda">
          <ProfessionalSetupWizard
            ownerMode
            professionalId={professionalId}
            services={services.data ?? []}
            assigned={assigned.data ?? []}
            hours={hours.data ?? []}
            blocks={blocks.data ?? []}
          />
        </section>
        <div className="form-stack">
          <section className="panel-card">
            <h2>Modelo financeiro</h2>
            <p className="muted">Defina com clareza a quem pertence o valor e quem recebe do cliente.</p>
            <form action={updateProfessionalFinancialModel} className="form-stack compact">
              <input type="hidden" name="professional_id" value={professionalId} />
              <label>Modelo<select name="financial_model" defaultValue={professional.financial_model}>
                <option value="BUSINESS_KEEPS_ALL">100% para o negócio</option>
                <option value="PROFESSIONAL_KEEPS_ALL">100% para o profissional</option>
                <option value="PERCENTAGE_COMMISSION">Comissão percentual</option>
                <option value="FIXED_COMMISSION">Comissão fixa</option>
              </select></label>
              <label>Percentual (%) ou valor fixo (R$)<input name="financial_value" type="number" min="0" step="0.01" defaultValue={professional.financial_value / 100} /></label>
              <label>Quem recebe o pagamento?<select name="payment_receiver" defaultValue={professional.payment_receiver}>
                <option value="BUSINESS">Estabelecimento</option>
                <option value="PROFESSIONAL">Próprio profissional</option>
              </select></label>
              <label>Chave PIX (opcional)<input name="pix_key" defaultValue={professional.pix_key ?? ""} /></label>
              <SubmitButton>Salvar modelo financeiro</SubmitButton>
            </form>
          </section>
          <section className="panel-card" id="acesso">
            <h2>Acesso</h2>
            <p><strong>Status:</strong> {professional.user_id ? "Login ativo" : "Sem login vinculado"}</p>
            <p className="muted">Por segurança, senhas atuais nunca são exibidas. Redefinições devem gerar uma nova senha temporária.</p>
          </section>
        </div>
      </div>
    </>
  );
}
