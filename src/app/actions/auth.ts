"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

function messageUrl(path: string, type: "error" | "success", message: string) {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}

export async function login(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect(messageUrl("/login", "error", parsed.error.issues[0].message));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(messageUrl("/login", "error", "E-mail ou senha inválidos."));

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  if (platformAdmin) redirect("/admin");

  if (!membership) redirect("/onboarding");
  if (membership.role === "PROFESSIONAL") {
    const { data: professional } = await supabase
      .from("professionals")
      .select("setup_completed_at")
      .eq("user_id", data.user.id)
      .maybeSingle();
    redirect(professional?.setup_completed_at ? "/painel/minha-agenda" : "/painel/configuracao-inicial");
  }
  redirect("/painel");
}

export async function signup(formData: FormData) {
  const parsed = credentialsSchema.extend({ full_name: z.string().trim().min(2).max(120) }).safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect(messageUrl("/cadastro", "error", parsed.error.issues[0].message));

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) redirect(messageUrl("/cadastro", "error", "Não foi possível criar a conta."));
  redirect(messageUrl("/login", "success", "Conta criada. Confirme seu e-mail, se solicitado."));
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) redirect(messageUrl("/esqueci-a-senha", "error", "Informe um e-mail válido."));

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/redefinir-senha`,
  });
  redirect(messageUrl("/esqueci-a-senha", "success", "Se a conta existir, enviaremos as instruções."));
}

export async function updatePassword(formData: FormData) {
  const password = z.string().min(8).safeParse(formData.get("password"));
  if (!password.success) redirect(messageUrl("/redefinir-senha", "error", "Use pelo menos 8 caracteres."));

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) redirect(messageUrl("/redefinir-senha", "error", "O link expirou. Solicite outro."));
  redirect(messageUrl("/login", "success", "Senha atualizada."));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
