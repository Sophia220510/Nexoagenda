"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function back(message: string, type: "error" | "success" = "error"): never {
  redirect(`/painel/lista-de-espera?${type}=${encodeURIComponent(message)}`);
}

export async function createWaitlistEntry(formData: FormData) {
  await requireOperator();
  const parsed = z
    .object({
      customer_name: z.string().trim().min(2).max(120),
      customer_phone: z.string().trim().min(8).max(30),
      service_id: z.string().uuid(),
      professional_id: z.union([z.literal(""), z.string().uuid()]),
      preferred_date: z.string().date(),
      preferred_period: z.enum(["ANY", "MORNING", "AFTERNOON", "EVENING"]),
      notes: z.string().trim().max(1000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("Revise os dados da lista de espera.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_waitlist_entry", {
    p_customer_name: parsed.data.customer_name,
    p_customer_phone: parsed.data.customer_phone,
    p_service_id: parsed.data.service_id,
    p_professional_id: parsed.data.professional_id || null,
    p_preferred_date: parsed.data.preferred_date,
    p_preferred_period: parsed.data.preferred_period,
    p_notes: parsed.data.notes || undefined,
  });
  if (error) back("Não foi possível adicionar à lista de espera.");
  revalidatePath("/painel/lista-de-espera");
  back("Cliente adicionado à lista de espera.", "success");
}

export async function updateWaitlistStatus(formData: FormData) {
  await requireOperator();
  const parsed = z
    .object({
      entry_id: z.string().uuid(),
      status: z.enum([
        "WAITING",
        "CONTACTED",
        "BOOKED",
        "CANCELLED",
        "EXPIRED",
      ]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("Atualização inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_waitlist_status", {
    p_entry_id: parsed.data.entry_id,
    p_status: parsed.data.status,
  });
  if (error) back("Não foi possível atualizar a lista.");
  revalidatePath("/painel/lista-de-espera");
  back("Lista de espera atualizada.", "success");
}
