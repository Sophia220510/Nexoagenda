"use client";
import { useActionState, useState } from "react";
import {
  resetUserPasswordAsAdmin,
  type ResetPasswordState,
} from "@/app/admin/actions";
export function ResetPasswordForm({ userId }: { userId: string }) {
  const [value, setValue] = useState("");
  const [state, action, pending] = useActionState(
    resetUserPasswordAsAdmin,
    {} as ResetPasswordState,
  );
  return (
    <form action={action} className="reset-form">
      <input type="hidden" name="user_id" value={userId} />
      <input
        name="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nova senha"
        minLength={10}
        required
      />
      <button className="button-ghost" disabled={pending}>
        Salvar senha
      </button>
      {state.error && <small className="notice-error">{state.error}</small>}
      {state.password && (
        <small>
          Senha definida: <code>{state.password}</code>
        </small>
      )}
    </form>
  );
}
