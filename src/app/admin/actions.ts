"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalAuthIdentifier, normalizeUsername } from "@/lib/username";
import { getCurrentUser } from "@/lib/auth";

function fail(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }
const uuid = z.string().uuid();

export async function updateBusinessAsAdmin(formData: FormData) {
  await requirePlatformAdmin();
  const id = uuid.safeParse(formData.get("business_id"));
  const path = id.success ? `/admin/empresas/${id.data}` : "/admin/empresas";
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const logo = String(formData.get("logo_url") ?? "").trim();
  let phone = "";
  try { phone = normalizePhone(String(formData.get("phone") ?? "")); } catch { fail(path, "Informe um telefone válido."); }
  if (!id.success || name.length < 2 || !timezone || (logo && !URL.canParse(logo))) fail(path, "Revise os dados da empresa.");
  const supabase = await createClient();
  let type = z.enum(businessTypes).safeParse(formData.get("business_type"));
  if (!type.success) { const { data: current } = await supabase.from("businesses").select("business_type").eq("id",id.data).maybeSingle(); type=z.enum(businessTypes).safeParse(current?.business_type); }
  if (!type.success) fail(path,"Categoria inválida.");
  const { error } = await supabase.rpc("admin_update_business_v2", { p_business_id: id.data, p_name: name, p_business_type:type.data, p_phone: phone, p_logo_url: logo, p_timezone: timezone, p_active: formData.get("active") === "on" });
  if (error) fail(path, "Não foi possível atualizar a empresa.");
  revalidatePath(path); revalidatePath("/admin");
  redirect(`${path}?success=Empresa atualizada e ação auditada.`);
}

export async function updateProfessionalAsAdmin(formData: FormData) {
  await requirePlatformAdmin();
  const id = uuid.safeParse(formData.get("professional_id"));
  const businessId = uuid.safeParse(formData.get("business_id"));
  const path = businessId.success ? `/admin/empresas/${businessId.data}` : "/admin/empresas";
  const name = String(formData.get("name") ?? "").trim();
  const photo = String(formData.get("photo_url") ?? "").trim();
  if (!id.success || name.length < 2 || (photo && !URL.canParse(photo))) fail(path, "Revise os dados do profissional.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_professional", { p_professional_id: id.data, p_name: name, p_photo_url: photo, p_bio: String(formData.get("bio") ?? "").trim(), p_active: formData.get("active") === "on" });
  if (error) fail(path, "Não foi possível atualizar o profissional.");
  revalidatePath(path); redirect(`${path}?success=Profissional atualizado e ação auditada.`);
}

export async function updateBusinessCategoryAsAdmin(formData: FormData) {
  await requirePlatformAdmin(); const id=uuid.safeParse(formData.get("business_id")); const type=z.enum(businessTypes).safeParse(formData.get("business_type")); if(!id.success||!type.success) fail("/admin/empresas","Categoria inválida.");
  const supabase=await createClient(); const {data}=await supabase.from("businesses").select("name,phone,logo_url,timezone,active").eq("id",id.data).maybeSingle(); if(!data) fail("/admin/empresas","Estabelecimento não encontrado.");
  const {error}=await supabase.rpc("admin_update_business_v2",{p_business_id:id.data,p_name:data.name,p_business_type:type.data,p_phone:data.phone,p_logo_url:data.logo_url??"",p_timezone:data.timezone,p_active:data.active}); if(error) fail(`/admin/empresas/${id.data}`,"Não foi possível alterar a categoria.");
  revalidatePath(`/admin/empresas/${id.data}`); redirect(`/admin/empresas/${id.data}?success=Categoria atualizada.`);
}

export async function updateServiceAsAdmin(formData: FormData) {
  await requirePlatformAdmin();
  const id = uuid.safeParse(formData.get("service_id"));
  const businessId = uuid.safeParse(formData.get("business_id"));
  const path = businessId.success ? `/admin/empresas/${businessId.data}` : "/admin/empresas";
  const price = Math.round(Number(formData.get("price")) * 100);
  const duration = Number(formData.get("duration"));
  const name = String(formData.get("name") ?? "").trim();
  if (!id.success || name.length < 2 || !Number.isInteger(price) || price < 0 || !Number.isInteger(duration) || duration < 5) fail(path, "Revise os dados do serviço.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_service", { p_service_id: id.data, p_name: name, p_description: String(formData.get("description") ?? "").trim(), p_price_cents: price, p_duration_minutes: duration, p_active: formData.get("active") === "on" });
  if (error) fail(path, "Não foi possível atualizar o serviço.");
  revalidatePath(path); redirect(`${path}?success=Serviço atualizado e ação auditada.`);
}

const businessTypes = ["BARBERSHOP","SALON","AESTHETICS","CLINIC","OFFICE","TATTOO","MANICURE","PERSONAL_TRAINER","PET_SERVICE","MASSAGE","STUDIO","CONSULTING","OTHER"] as const;
const newBusinessSchema = z.object({
  business: z.object({ name: z.string().trim().min(2).max(120), business_type: z.enum(businessTypes), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(63), phone: z.string().min(8), timezone: z.string().min(3).max(64), logo_url: z.union([z.literal(""),z.string().url()]) }),
  users: z.array(z.object({ name: z.string().trim().min(2).max(120), username: z.string(), password: z.string().min(10), role: z.enum(["OWNER","PROFESSIONAL"]), is_professional: z.boolean(), photo_url: z.union([z.literal(""),z.string().url()]), active: z.boolean() })).min(1).refine((users) => users.filter((user) => user.role === "OWNER").length === 1, "Informe exatamente um OWNER."),
  services: z.array(z.object({ name: z.string().trim().min(2).max(120), price_cents: z.number().int().min(0), duration_minutes: z.number().int().min(5).max(720) })).min(1),
});

export type CreateBusinessState = { error?: string; businessId?: string; credentials?: Array<{ label: string; username: string; password: string }> };
export async function createBusinessAsAdmin(_state: CreateBusinessState, formData: FormData): Promise<CreateBusinessState> {
  await requirePlatformAdmin();
  let raw: unknown; try { raw = JSON.parse(String(formData.get("payload") ?? "")); } catch { return { error: "Dados inválidos." }; }
  const parsed = newBusinessSchema.safeParse(raw); if (!parsed.success) return { error: parsed.error.issues[0].message };
  let phone: string; try { phone = normalizePhone(parsed.data.business.phone); } catch { return { error: "WhatsApp inválido." }; }
  const usernames: string[] = [];
  try { for (const user of parsed.data.users) usernames.push(normalizeUsername(user.username)); } catch (error) { return { error: error instanceof Error ? error.message : "Username inválido." }; }
  if (new Set(usernames).size !== usernames.length) return { error: "Os usernames devem ser diferentes." };
  const admin = createAdminClient(); const { data: existing } = await admin.from("login_identities").select("username_normalized").in("username_normalized", usernames);
  if (existing?.length) return { error: `O usuário ${existing[0].username_normalized} já está em uso.` };
  const createdIds: string[] = [];
  try {
    const users = [];
    for (let index = 0; index < parsed.data.users.length; index += 1) {
      const input = parsed.data.users[index]; const username = usernames[index]; const identifier = internalAuthIdentifier(username);
      const { data, error } = await admin.auth.admin.createUser({ email: identifier, password: input.password, email_confirm: true, user_metadata: { full_name: input.name, username } });
      if (error || !data.user) throw error ?? new Error("Falha ao criar usuário."); createdIds.push(data.user.id);
      users.push({ ...input, user_id: data.user.id, username, internal_auth_identifier: identifier, professional_id: crypto.randomUUID() });
    }
    const bundle = { business: { ...parsed.data.business, phone, id: crypto.randomUUID() }, users, services: parsed.data.services.map((service) => ({ ...service, id: crypto.randomUUID() })) };
    const supabase = await createClient(); const { data: businessId, error } = await supabase.rpc("admin_create_business_bundle", { p_bundle: bundle });
    if (error) throw error;
    revalidatePath("/admin"); revalidatePath("/admin/empresas");
    return { businessId, credentials: parsed.data.users.map((user, index) => ({ label: user.name, username: usernames[index], password: user.password })) };
  } catch (error) {
    await Promise.all(createdIds.map((id) => admin.auth.admin.deleteUser(id)));
    return { error: error instanceof Error ? error.message : "Não foi possível criar o estabelecimento." };
  }
}

export type ResetPasswordState = { error?: string; password?: string };
export async function resetUserPasswordAsAdmin(_state: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  await requirePlatformAdmin(); const userId = uuid.safeParse(formData.get("user_id")); const password = z.string().min(10).safeParse(formData.get("password"));
  if (!userId.success || !password.success) return { error: "Usuário ou senha temporária inválidos." };
  const admin = createAdminClient(); const { error } = await admin.auth.admin.updateUserById(userId.data, { password: password.data }); if (error) return { error: "Não foi possível redefinir a senha." };
  await admin.from("login_identities").update({ must_change_password: true }).eq("user_id", userId.data);
  const actor = await getCurrentUser(); const { data: member } = await admin.from("business_members").select("business_id").eq("user_id", userId.data).maybeSingle();
  if (actor) await admin.from("admin_audit_logs").insert({ actor_user_id: actor.id, business_id: member?.business_id ?? null, action: "USER_PASSWORD_RESET", entity_type: "user", entity_id: userId.data, metadata: {} });
  return { password: password.data };
}

export type AddBusinessUserState = { error?: string; username?: string; password?: string };
export async function addBusinessUserAsAdmin(_state: AddBusinessUserState, formData: FormData): Promise<AddBusinessUserState> {
  await requirePlatformAdmin(); const businessId = uuid.safeParse(formData.get("business_id")); const name = z.string().trim().min(2).max(120).safeParse(formData.get("name")); const pass = z.string().min(10).safeParse(formData.get("password")); const role = z.enum(["OWNER","PROFESSIONAL"]).safeParse(formData.get("role"));
  let username: string; try { username = normalizeUsername(String(formData.get("username"))); } catch { return { error: "Username inválido ou reservado." }; }
  if (!businessId.success || !name.success || !pass.success || !role.success) return { error: "Revise os dados do usuário." };
  const admin = createAdminClient(); const { data: exists } = await admin.from("login_identities").select("user_id").eq("username_normalized", username).maybeSingle(); if (exists) return { error: "Username já está em uso." };
  const identifier = internalAuthIdentifier(username); const { data, error } = await admin.auth.admin.createUser({ email: identifier, password: pass.data, email_confirm: true, user_metadata: { full_name: name.data, username } }); if (error || !data.user) return { error: "Não foi possível criar o usuário." };
  try {
    await admin.from("profiles").upsert({ id: data.user.id, full_name: name.data });
    const { error: identityError } = await admin.from("login_identities").insert({ user_id: data.user.id, username, username_normalized: username, internal_auth_identifier: identifier, must_change_password: true }); if (identityError) throw identityError;
    const { error: memberError } = await admin.from("business_members").insert({ business_id: businessId.data, user_id: data.user.id, role: role.data }); if (memberError) throw memberError;
    if (role.data === "PROFESSIONAL") { const { error: professionalError } = await admin.from("professionals").insert({ business_id: businessId.data, user_id: data.user.id, name: name.data }); if (professionalError) throw professionalError; }
    const actor = await getCurrentUser(); if (actor) await admin.from("admin_audit_logs").insert({ actor_user_id: actor.id, business_id: businessId.data, action: role.data === "PROFESSIONAL" ? "USER_AND_PROFESSIONAL_CREATED" : "USER_CREATED", entity_type: "user", entity_id: data.user.id, metadata: { username, role: role.data } });
    revalidatePath(`/admin/empresas/${businessId.data}`); return { username, password: pass.data };
  } catch { await admin.auth.admin.deleteUser(data.user.id); return { error: "A criação foi revertida porque os dados não puderam ser vinculados." }; }
}
