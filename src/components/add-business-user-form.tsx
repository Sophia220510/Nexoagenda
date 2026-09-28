"use client";
import { useActionState, useState } from "react";
import {
  addBusinessUserAsAdmin,
  type AddBusinessUserState,
} from "@/app/admin/actions";
export function AddBusinessUserForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(
    addBusinessUserAsAdmin,
    {} as AddBusinessUserState,
  );
  const [password, setPassword] = useState("");
  if (state.password)
    return (
      <div className="credential-result">
        <strong>Usuário criado. Salve agora:</strong>
        <code>{state.username}</code>
        <code>{state.password}</code>
      </div>
    );
  return (
    <form action={action} className="form-stack compact">
      <input type="hidden" name="business_id" value={businessId} />
      <div className="field-grid">
        <label>
          Nome
          <input name="name" required />
        </label>
        <label>
          Username
          <input name="username" required />
        </label>
        <label>
          Senha de acesso
          <div>
            <input
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              required
            />
          </div>
        </label>
        <label>
          Role
          <select name="role">
            <option value="PROFESSIONAL">PROFESSIONAL</option>
            <option value="RECEPTIONIST">RECEPTIONIST</option>
            <option value="OWNER">OWNER</option>
          </select>
        </label>
      </div>
      {state.error && <p className="notice notice-error">{state.error}</p>}
      <button className="button" disabled={pending}>
        {pending ? "Criando..." : "Adicionar usuário/profissional"}
      </button>
    </form>
  );
}
