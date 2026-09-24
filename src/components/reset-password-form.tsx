"use client";
import { useActionState, useState } from "react";
import { resetUserPasswordAsAdmin, type ResetPasswordState } from "@/app/admin/actions";
function generate() { const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"; const bytes=crypto.getRandomValues(new Uint8Array(18)); return Array.from(bytes,(byte)=>chars[byte%chars.length]).join(""); }
export function ResetPasswordForm({ userId }: { userId: string }) {
  const [value,setValue]=useState(""); const [state,action,pending]=useActionState(resetUserPasswordAsAdmin,{} as ResetPasswordState);
  return <form action={action} className="reset-form"><input type="hidden" name="user_id" value={userId} /><input name="password" value={value} onChange={(e)=>setValue(e.target.value)} placeholder="Nova senha temporária" minLength={10} required /><button type="button" className="button-ghost" onClick={()=>setValue(generate())}>Gerar</button><button className="button-ghost" disabled={pending}>Redefinir</button>{state.error&&<small className="notice-error">{state.error}</small>}{state.password&&<small>Mostrada uma vez: <code>{state.password}</code></small>}</form>;
}
