"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { internalAuthIdentifier, normalizeUsername } from "@/lib/username";
import {
  getStoredAccount,
  removeSavedAccount,
  saveAccount,
  updateSavedAccountToken,
  type SavedAccount,
} from "@/lib/saved-accounts";

const credentialsSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});
const usernameCredentialsSchema = z.object({
  username: z.string().trim().min(3).max(120),
  password: z.string().min(8),
});
function messageUrl(path: string, type: "error" | "success", message: string) {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}

async function clearSupabaseSessionCookies() {
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"))
      store.delete(cookie.name);
  }
}

async function getAccountContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> },
  usernameFallback = "",
) {
  const [{ data: identity }, { data: membership }, { data: platformAdmin }] =
    await Promise.all([
      supabase
        .from("login_identities")
        .select("username,active")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("business_members")
        .select("role,businesses(name)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle(),
    ]);

  if (identity && !identity.active) return null;
  let destination = platformAdmin ? "/admin" : "/painel";
  if (!platformAdmin && !membership) destination = "/onboarding";
  if (membership?.role === "PROFESSIONAL") {
    const { data: professional } = await supabase
      .from("professionals")
      .select("setup_completed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    destination = professional?.setup_completed_at
      ? "/painel/minha-agenda"
      : "/painel/configuracao-inicial";
  }

  const business = membership?.businesses as unknown as { name: string } | null;
  const role = platformAdmin
    ? "Administrador supremo"
    : membership?.role === "OWNER"
      ? "Dono"
      : membership?.role === "RECEPTIONIST"
        ? "Recepcionista"
        : membership?.role === "PROFESSIONAL"
          ? "Profissional"
          : "Conta";
  const account: SavedAccount = {
    userId: user.id,
    username: identity?.username ?? usernameFallback,
    name:
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name) ||
      identity?.username ||
      user.email?.split("@")[0] ||
      "Usuário",
    role,
    businessName: platformAdmin ? "Plataforma NEXO" : business?.name ?? "NEXO",
    destination,
  };
  return { account, destination };
}

export async function login(formData: FormData) {
  const parsed = usernameCredentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    redirect(messageUrl("/login", "error", "Usuário ou senha inválidos."));
  let identifier: string;
  try {
    identifier = parsed.data.username.includes("@")
      ? z.string().email().parse(parsed.data.username.toLowerCase())
      : internalAuthIdentifier(normalizeUsername(parsed.data.username, true));
  } catch {
    redirect(messageUrl("/login", "error", "Usuário ou senha inválidos."));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password: parsed.data.password,
  });
  if (error)
    redirect(messageUrl("/login", "error", "Usuário ou senha inválidos."));
  const context = await getAccountContext(
    supabase,
    data.user,
    parsed.data.username,
  );
  if (!context) {
    await supabase.auth.signOut();
    redirect(messageUrl("/login", "error", "Usuário ou senha inválidos."));
  }
  if (formData.get("remember_account") === "on" && data.session)
    await saveAccount(context.account, data.session.refresh_token);
  redirect(context.destination);
}

export async function switchAccount(formData: FormData) {
  const userId = z.string().uuid().safeParse(formData.get("user_id"));
  if (!userId.success)
    redirect(messageUrl("/login", "error", "Conta salva inválida."));
  const target = await getStoredAccount(userId.data);
  if (!target)
    redirect(messageUrl("/login", "error", "Essa conta não está mais salva."));

  const supabase = await createClient();
  const [{ data: current }, { data: verifiedCurrent }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);
  if (
    current.session &&
    verifiedCurrent.user?.id === current.session.user.id
  )
    await updateSavedAccountToken(
      current.session.user.id,
      current.session.refresh_token,
    );

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: target.refreshToken,
  });
  if (error || !data.session || data.session.user.id !== userId.data) {
    await clearSupabaseSessionCookies();
    redirect(
      `${messageUrl(
        "/login",
        "error",
        "Não foi possível restaurar a sessão. Entre novamente nesta conta.",
      )}&username=${encodeURIComponent(target.username)}`,
    );
  }
  const context = await getAccountContext(
    supabase,
    data.session.user,
    target.username,
  );
  if (!context) {
    await removeSavedAccount(userId.data);
    await supabase.auth.signOut({ scope: "local" });
    redirect(messageUrl("/login", "error", "Essa conta está inativa."));
  }
  await saveAccount(context.account, data.session.refresh_token);
  redirect(context.destination);
}

export async function forgetSavedAccount(formData: FormData) {
  const userId = z.string().uuid().safeParse(formData.get("user_id"));
  if (userId.success) await removeSavedAccount(userId.data);
  revalidatePath("/login");
  revalidatePath("/painel", "layout");
  revalidatePath("/admin", "layout");
}

export async function addAnotherAccount() {
  const supabase = await createClient();
  const [{ data }, { data: verified }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);
  if (data.session && verified.user?.id === data.session.user.id) {
    const context = await getAccountContext(supabase, verified.user);
    if (context)
      await saveAccount(context.account, data.session.refresh_token);
    await clearSupabaseSessionCookies();
  }
  redirect("/login?add=1");
}

export async function signup(formData: FormData) {
  const parsed = credentialsSchema
    .extend({ full_name: z.string().trim().min(2).max(120) })
    .safeParse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success)
    redirect(messageUrl("/cadastro", "error", parsed.error.issues[0].message));
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error)
    redirect(
      messageUrl("/cadastro", "error", "Não foi possível criar a conta."),
    );
  redirect(
    messageUrl(
      "/login",
      "success",
      "Conta criada. Confirme seu e-mail, se solicitado.",
    ),
  );
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success)
    redirect(
      messageUrl("/esqueci-a-senha", "error", "Informe um e-mail válido."),
    );
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/redefinir-senha`,
  });
  redirect(
    messageUrl(
      "/esqueci-a-senha",
      "success",
      "Se a conta existir, enviaremos as instruções.",
    ),
  );
}

export async function updatePassword(formData: FormData) {
  const password = z.string().min(8).safeParse(formData.get("password"));
  if (!password.success)
    redirect(
      messageUrl("/redefinir-senha", "error", "Use pelo menos 8 caracteres."),
    );
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error)
    redirect(
      messageUrl(
        "/redefinir-senha",
        "error",
        "O link expirou. Solicite outro.",
      ),
    );
  await supabase.rpc("complete_password_change");
  redirect(messageUrl("/login", "success", "Senha atualizada."));
}

export async function changeTemporaryPassword(formData: FormData) {
  const password = z.string().min(10).safeParse(formData.get("password"));
  if (!password.success)
    redirect(
      messageUrl("/trocar-senha", "error", "Use pelo menos 10 caracteres."),
    );
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error)
    redirect(
      messageUrl("/trocar-senha", "error", "Não foi possível alterar a senha."),
    );
  await supabase.rpc("complete_password_change");
  const { data: admin } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("active", true)
    .maybeSingle();
  if (admin) redirect("/admin");
  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .limit(1)
    .maybeSingle();
  redirect(
    membership?.role === "PROFESSIONAL"
      ? "/painel/configuracao-inicial"
      : "/painel",
  );
}

export async function logout() {
  const supabase = await createClient();
  const [{ data }, { data: verified }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);
  if (data.session && verified.user?.id === data.session.user.id) {
    await updateSavedAccountToken(
      data.session.user.id,
      data.session.refresh_token,
    );
    if (await getStoredAccount(data.session.user.id))
      await clearSupabaseSessionCookies();
    else await supabase.auth.signOut();
  } else await clearSupabaseSessionCookies();
  redirect("/login");
}
