"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2, X } from "lucide-react";
import {
  addAnotherAccount,
  forgetSavedAccount,
  switchAccount,
} from "@/app/actions/auth";
import type { SavedAccount } from "@/lib/saved-accounts";

export function AccountSwitcher({
  accounts,
  currentUserId,
  mode = "menu",
}: {
  accounts: SavedAccount[];
  currentUserId?: string;
  mode?: "menu" | "login";
}) {
  const [open, setOpen] = useState(false);
  const content = (
    <div className={`account-switcher-content ${mode === "login" ? "is-login" : ""}`}>
      <div className="account-switcher-heading">
        <div>
          <strong>Contas salvas</strong>
          <small>Troque sem digitar a senha novamente.</small>
        </div>
        {mode === "menu" && (
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="saved-account-list">
        {accounts.map((account) => {
          const current = account.userId === currentUserId;
          return (
            <article className="saved-account-row" key={account.userId}>
              <span>{account.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{account.name}</strong>
                <small>
                  @{account.username} · {account.role}
                </small>
                <small>{account.businessName}</small>
              </div>
              {current ? (
                <span className="current-account" title="Conta atual">
                  <Check size={16} />
                </span>
              ) : (
                <form action={switchAccount}>
                  <input type="hidden" name="user_id" value={account.userId} />
                  <button className="account-switch-button">Acessar</button>
                </form>
              )}
              {!current && (
                <form action={forgetSavedAccount}>
                  <input type="hidden" name="user_id" value={account.userId} />
                  <button className="forget-account" aria-label={`Remover ${account.name}`}>
                    <Trash2 size={15} />
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>
      {mode === "menu" && (
        <form action={addAnotherAccount}>
          <button className="add-account-button">
            <Plus size={17} />
            Adicionar outra conta
          </button>
        </form>
      )}
      <p className="account-security-note">
        {mode === "login"
          ? "Ou entre com outro usuário no formulário abaixo para salvá-lo."
          : "As senhas não são armazenadas. As sessões ficam protegidas neste navegador."}
      </p>
    </div>
  );

  if (mode === "login") return accounts.length ? content : null;
  return (
    <>
      <button
        type="button"
        className="account-switcher-trigger"
        onClick={() => setOpen(true)}
        aria-label="Trocar ou adicionar conta"
        title="Trocar conta"
      >
        <ChevronsUpDown size={18} />
      </button>
      {open && (
        <div className="account-switcher-overlay" onMouseDown={() => setOpen(false)}>
          <div onMouseDown={(event) => event.stopPropagation()}>{content}</div>
        </div>
      )}
    </>
  );
}
