import Link from "next/link";
import { login } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const query = await searchParams;
  return (
    <AuthCard title="Entre na sua conta" description="Acesse a agenda e a operação do seu negócio." footer={<p>Primeira vez? <Link href="/cadastro">Criar conta</Link></p>}>
      <Notice {...query} />
      <form action={login} className="form-stack">
        <label>Usuário<input name="username" autoComplete="username" required /></label>
        <label>Senha<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
        <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>
      </form>
    </AuthCard>
  );
}
