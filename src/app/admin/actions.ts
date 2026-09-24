"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase.rpc("admin_update_business", { p_business_id: id.data, p_name: name, p_phone: phone, p_logo_url: logo, p_timezone: timezone, p_active: formData.get("active") === "on" });
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
