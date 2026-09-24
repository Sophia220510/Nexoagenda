import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <AuthCard title="Crie seu espaço" description="Comece pela estrutura da sua empresa. Sem cobrança nesta fase." footer={<p>Já possui conta? <Link href="/login">Entrar</Link></p>}>
      <Notice {...query} />
      <form action={signup} className="form-stack">
        <label>Nome completo<input name="full_name" autoComplete="name" required /></label>
        <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
        <label>Senha<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <SubmitButton pendingText="Criando conta...">Criar conta</SubmitButton>
      </form>
    </AuthCard>
  );
}

