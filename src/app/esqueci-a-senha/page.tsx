import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const query = await searchParams;
  return (
    <AuthCard title="Recupere seu acesso" description="Enviaremos um link seguro para redefinir sua senha." footer={<Link href="/login">Voltar ao login</Link>}>
      <Notice {...query} />
      <form action={requestPasswordReset} className="form-stack">
        <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
        <SubmitButton pendingText="Enviando...">Enviar instruções</SubmitButton>
      </form>
    </AuthCard>
  );
}

