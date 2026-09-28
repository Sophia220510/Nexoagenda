import { changeTemporaryPassword } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth-card";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireAuth } from "@/lib/auth";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAuth();
  return (
    <AuthCard
      title="Crie sua nova senha"
      description="Defina uma nova senha para a sua conta."
    >
      <Notice {...await searchParams} />
      <form action={changeTemporaryPassword} className="form-stack">
        <label>
          Nova senha
          <input
            name="password"
            type="password"
            minLength={10}
            autoComplete="new-password"
            required
          />
        </label>
        <SubmitButton>Salvar e continuar</SubmitButton>
      </form>
    </AuthCard>
  );
}
