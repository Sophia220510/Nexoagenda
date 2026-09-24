"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, professionalSchema, serviceSchema, workingHourSchema } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { requireMembership } from "@/lib/auth";

function toError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createBusiness(formData: FormData) {
  await requireAuth();
  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    phone: formData.get("phone"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) toError("/onboarding", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_business_with_owner", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_phone: parsed.data.phone,
    p_timezone: parsed.data.timezone,
  });
  if (error) {
    const friendly = error.code === "23505" ? "Esse endereço já está em uso." : "Não foi possível criar a empresa.";
    toError("/onboarding", friendly);
  }
  redirect("/painel");
}

export async function createService(formData: FormData) {
  const membership = await requireOwner();
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price_cents: Math.round(Number(formData.get("price")) * 100),
    default_duration_minutes: formData.get("duration"),
  });
  if (!parsed.success) toError("/painel/servicos", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    business_id: membership.business_id,
    ...parsed.data,
  });
  if (error) toError("/painel/servicos", "Não foi possível criar o serviço.");
  revalidatePath("/painel/servicos");
}

export async function toggleService(formData: FormData) {
  const membership = await requireOwner();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ active: !active })
    .eq("id", id)
    .eq("business_id", membership.business_id);
  if (error) toError("/painel/servicos", "Não foi possível atualizar o serviço.");
  revalidatePath("/painel/servicos");
}

export async function updateService(formData: FormData) {
  const membership = await requireOwner();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"), description: formData.get("description"),
    price_cents: Math.round(Number(formData.get("price")) * 100),
    default_duration_minutes: formData.get("duration"),
  });
  if (!id.success || !parsed.success) toError("/painel/servicos", "Dados do serviço inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(parsed.data).eq("id", id.data).eq("business_id", membership.business_id);
  if (error) toError("/painel/servicos", "Não foi possível editar o serviço.");
  revalidatePath("/painel/servicos");
}

export async function createProfessional(formData: FormData) {
  const membership = await requireOwner();
  const parsed = professionalSchema.safeParse({
    name: formData.get("name"),
    photo_url: formData.get("photo_url"),
    bio: formData.get("bio"),
    service_ids: formData.getAll("service_ids"),
  });
  if (!parsed.success) toError("/painel/profissionais", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: professional, error } = await supabase
    .from("professionals")
    .insert({
      business_id: membership.business_id,
      name: parsed.data.name,
      photo_url: parsed.data.photo_url,
      bio: parsed.data.bio,
    })
    .select("id")
    .single();
  if (error || !professional) toError("/painel/profissionais", "Não foi possível criar o profissional.");

  if (parsed.data.service_ids.length) {
    const { error: relationError } = await supabase.from("professional_services").insert(
      parsed.data.service_ids.map((serviceId) => ({
        business_id: membership.business_id,
        professional_id: professional.id,
        service_id: serviceId,
      })),
    );
    if (relationError) toError("/painel/profissionais", "Profissional criado, mas os serviços não foram vinculados.");
  }
  revalidatePath("/painel/profissionais");
}

export async function toggleProfessional(formData: FormData) {
  const membership = await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase
    .from("professionals")
    .update({ active: formData.get("active") !== "true" })
    .eq("id", String(formData.get("id")))
    .eq("business_id", membership.business_id);
  if (error) toError("/painel/profissionais", "Não foi possível atualizar o profissional.");
  revalidatePath("/painel/profissionais");
}

export async function updateProfessional(formData: FormData) {
  const membership = await requireOwner();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = professionalSchema.safeParse({ name: formData.get("name"), photo_url: formData.get("photo_url"), bio: formData.get("bio"), service_ids: formData.getAll("service_ids") });
  if (!id.success || !parsed.success) toError("/painel/profissionais", "Dados do profissional inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.from("professionals").update({ name: parsed.data.name, photo_url: parsed.data.photo_url, bio: parsed.data.bio }).eq("id", id.data).eq("business_id", membership.business_id);
  if (error) toError("/painel/profissionais", "Não foi possível editar o profissional.");
  await supabase.from("professional_services").update({ active: false }).eq("professional_id", id.data).eq("business_id", membership.business_id);
  if (parsed.data.service_ids.length) {
    const { error: relationError } = await supabase.from("professional_services").upsert(parsed.data.service_ids.map((serviceId) => ({ business_id: membership.business_id, professional_id: id.data, service_id: serviceId, active: true })), { onConflict: "professional_id,service_id" });
    if (relationError) toError("/painel/profissionais", "Dados salvos, mas os serviços não foram atualizados.");
  }
  revalidatePath("/painel/profissionais");
}

export async function createWorkingHour(formData: FormData) {
  const membership = await requireOwner();
  const parsed = workingHourSchema.safeParse({
    professional_id: formData.get("professional_id"),
    weekday: formData.get("weekday"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });
  if (!parsed.success) toError("/painel/profissionais", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.from("working_hours").insert({
    business_id: membership.business_id,
    ...parsed.data,
  });
  if (error) toError("/painel/profissionais", "Não foi possível adicionar o horário.");
  revalidatePath("/painel/profissionais");
}

export async function removeWorkingHour(formData: FormData) {
  const membership = await requireOwner();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) toError("/painel/profissionais", "Faixa inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("working_hours").delete().eq("id", id.data).eq("business_id", membership.business_id);
  if (error) toError("/painel/profissionais", "Não foi possível remover a faixa.");
  revalidatePath("/painel/profissionais");
}

export async function createBlockedTime(formData: FormData) {
  const membership = await requireMembership();
  const user = await requireAuth();
  const parsed = z.object({ professional_id: z.string().uuid(), starts_at: z.string().min(16), ends_at: z.string().min(16), reason: z.string().trim().max(500).optional() }).safeParse({
    professional_id: formData.get("professional_id"), starts_at: formData.get("starts_at"), ends_at: formData.get("ends_at"), reason: String(formData.get("reason") ?? "") || undefined,
  });
  const returnPath = membership.role === "OWNER" ? "/painel/agenda" : "/painel/minha-agenda";
  if (!parsed.success) toError(returnPath, "Dados do bloqueio inválidos.");
  const timezone = membership.businesses?.timezone ?? "America/Sao_Paulo";
  const startsAt = fromZonedTime(parsed.data.starts_at, timezone);
  const endsAt = fromZonedTime(parsed.data.ends_at, timezone);
  if (!Number.isFinite(startsAt.getTime()) || startsAt >= endsAt) toError(returnPath, "O fim deve ser posterior ao início.");
  const supabase = await createClient();
  const { error } = await supabase.from("blocked_times").insert({ business_id: membership.business_id, professional_id: parsed.data.professional_id, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), reason: parsed.data.reason ?? null, created_by: user.id });
  if (error) toError(returnPath, "Você não pode criar esse bloqueio.");
  revalidatePath(returnPath);
}

export async function removeBlockedTime(formData: FormData) {
  const membership = await requireMembership();
  const id = z.string().uuid().safeParse(formData.get("id"));
  const returnPath = membership.role === "OWNER" ? "/painel/agenda" : "/painel/minha-agenda";
  if (!id.success) toError(returnPath, "Bloqueio inválido.");
  const supabase = await createClient();
  const { error } = await supabase.from("blocked_times").delete().eq("id", id.data).eq("business_id", membership.business_id);
  if (error) toError(returnPath, "Você não pode remover esse bloqueio.");
  revalidatePath(returnPath);
}

export async function updateBusiness(formData: FormData) {
  const membership = await requireOwner();
  let phone: string;
  try {
    phone = normalizePhone(String(formData.get("phone")));
  } catch {
    toError("/painel/configuracoes", "Informe um WhatsApp válido.");
  }
  const parsed = onboardingSchema.pick({ name: true, timezone: true }).safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) toError("/painel/configuracoes", parsed.error.issues[0].message);

  const logo = String(formData.get("logo_url") ?? "").trim();
  if (logo && !URL.canParse(logo)) toError("/painel/configuracoes", "A URL do logo é inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({
    name: parsed.data.name,
    timezone: parsed.data.timezone,
    phone,
    logo_url: logo || null,
  }).eq("id", membership.business_id);
  if (error) toError("/painel/configuracoes", "Não foi possível salvar as configurações.");
  revalidatePath("/painel/configuracoes");
  revalidatePath(`/${membership.businesses?.slug ?? ""}`);
  redirect("/painel/configuracoes?success=Configurações%20salvas.");
}

const professionalConfigurationSchema = z.object({
  professional_id: z.string().uuid(),
  services: z.array(z.object({ service_id: z.string().uuid(), duration_override_minutes: z.number().int().min(5).max(480) })),
  working_hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), start_time: z.string().regex(/^\d{2}:\d{2}$/), end_time: z.string().regex(/^\d{2}:\d{2}$/) })),
  recurring_blocks: z.array(z.object({ weekday: z.number().int().min(0).max(6), start_time: z.string().regex(/^\d{2}:\d{2}$/), end_time: z.string().regex(/^\d{2}:\d{2}$/), reason: z.string().trim().max(200).optional() })),
});

export async function saveProfessionalConfiguration(formData: FormData) {
  const membership = await requireMembership();
  const parsed = professionalConfigurationSchema.safeParse({
    professional_id: formData.get("professional_id"),
    services: JSON.parse(String(formData.get("services") ?? "[]")),
    working_hours: JSON.parse(String(formData.get("working_hours") ?? "[]")),
    recurring_blocks: JSON.parse(String(formData.get("recurring_blocks") ?? "[]")),
  });
  const returnPath = membership.role === "OWNER"
    ? `/painel/profissionais/${String(formData.get("professional_id"))}`
    : "/painel/configuracao-inicial";
  if (!parsed.success || !parsed.data.services.length || !parsed.data.working_hours.length) {
    toError(returnPath, "Selecione ao menos um serviço e um horário de trabalho válido.");
  }
  if ([...parsed.data.working_hours, ...parsed.data.recurring_blocks].some((range) => range.start_time >= range.end_time)) {
    toError(returnPath, "Todo horário final deve ser posterior ao horário inicial.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("configure_professional", {
    p_professional_id: parsed.data.professional_id,
    p_services: parsed.data.services,
    p_working_hours: parsed.data.working_hours,
    p_recurring_blocks: parsed.data.recurring_blocks,
    p_mark_complete: true,
  });
  if (error) toError(returnPath, "Não foi possível salvar a configuração profissional.");
  revalidatePath("/painel");
  revalidatePath("/painel/profissionais");
  revalidatePath(returnPath);
  redirect(membership.role === "OWNER" ? `${returnPath}?success=Configuração salva.` : "/painel/minha-agenda?success=Sua agenda está pronta.");
}
