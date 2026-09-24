import { redirect } from "next/navigation";
import { createBusiness } from "@/app/actions/business";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentBusiness, requireAuth } from "@/lib/auth";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAuth();
  if (await getCurrentBusiness()) redirect("/painel");
  const query = await searchParams;
  return (
    <main className="onboarding-shell">
      <section className="onboarding-copy"><p className="eyebrow">Configuração inicial</p><h1>Seu negócio, sua agenda.</h1><p>Crie o espaço isolado da sua empresa. Você será associado como proprietário automaticamente.</p></section>
      <section className="auth-card">
        <h2>Dados do estabelecimento</h2>
        <Notice {...query} />
        <form action={createBusiness} className="form-stack">
          <label>Nome do estabelecimento<input name="name" required maxLength={120} /></label>
          <label>Endereço público<input name="slug" required minLength={3} maxLength={63} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="studio-do-joao" /><small>nexoagenda.com/studio-do-joao</small></label>
          <label>WhatsApp<input name="phone" inputMode="tel" placeholder="(11) 99999-9999" required /></label>
          <label>Fuso horário<input name="timezone" defaultValue={DEFAULT_TIMEZONE} required /></label>
          <SubmitButton pendingText="Criando empresa...">Criar minha empresa</SubmitButton>
        </form>
      </section>
    </main>
  );
}
