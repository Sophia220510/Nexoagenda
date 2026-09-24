import { updatePassword } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <AuthCard title="Defina uma nova senha" description="Use pelo menos oito caracteres.">
      <Notice {...query} />
      <form action={updatePassword} className="form-stack">
        <label>Nova senha<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <SubmitButton>Atualizar senha</SubmitButton>
      </form>
    </AuthCard>
  );
}

