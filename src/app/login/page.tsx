import Link from "next/link";
import { login } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { AccountSwitcher } from "@/components/account-switcher";
import { getSavedAccounts } from "@/lib/saved-accounts";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; username?: string }>;
}) {
  const query = await searchParams;
  const savedAccounts = await getSavedAccounts();
  return (
    <AuthCard
      title="Entre na sua conta"
      description="Acesse a agenda e a operação do seu negócio."
      footer={
        <p>
          Primeira vez? <Link href="/cadastro">Criar conta</Link>
        </p>
      }
    >
      <Notice {...query} />
      <AccountSwitcher accounts={savedAccounts} mode="login" />
      <form action={login} className="form-stack">
        <label>
          Usuário
          <input
            name="username"
            autoComplete="username"
            defaultValue={query.username ?? ""}
            required
          />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
        <label className="check remember-account">
          <input type="checkbox" name="remember_account" defaultChecked />
          Salvar esta conta neste navegador
        </label>
        <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>
      </form>
    </AuthCard>
  );
}
