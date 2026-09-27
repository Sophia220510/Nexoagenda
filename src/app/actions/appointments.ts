"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { requireMembership, requireOperator } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function appointmentError(message = "") {
  if (message.includes("outside_working_hours"))
    return "Esse horário fica fora do expediente.";
  if (message.includes("blocked_time") || message.includes("recurring_block"))
    return "Esse horário já está bloqueado.";
  if (message.includes("exclusion") || message.includes("conflict"))
    return "Esse horário acabou de ser ocupado. Escolha outro.";
  if (message.includes("future")) return "Escolha um horário futuro.";
  return "Não foi possível salvar o agendamento.";
}

export async function createInternalAppointment(formData: FormData) {
  const membership = await requireOperator();
  const path = "/painel/agendamentos/novo";
  const parsed = z
    .object({
      customer_id: z.union([z.literal(""), uuid]),
      professional_id: uuid,
      service_id: uuid,
      starts_at: dateTime,
      customer_name: z.string().trim().max(120).optional(),
      customer_phone: z.string().optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail(path, "Revise os dados informados.");
  let phone: string | null = null;
  if (!parsed.data.customer_id) {
    if (!parsed.data.customer_name || parsed.data.customer_name.length < 2)
      fail(path, "Informe o nome do cliente.");
    try {
      phone = normalizePhone(parsed.data.customer_phone ?? "");
    } catch {
      fail(path, "Informe um WhatsApp válido com DDD.");
    }
  }
  const startsAt = fromZonedTime(
    parsed.data.starts_at,
    membership.businesses?.timezone ?? "America/Sao_Paulo",
  );
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_internal_appointment", {
    p_professional_id: parsed.data.professional_id,
    p_service_id: parsed.data.service_id,
    p_starts_at: startsAt.toISOString(),
    p_customer_id: parsed.data.customer_id || undefined,
    p_customer_name: parsed.data.customer_name || undefined,
    p_customer_phone: phone || undefined,
    p_notes: parsed.data.notes || undefined,
  });
  if (error || !data) fail(path, appointmentError(error?.message));
  revalidatePath("/painel");
  revalidatePath("/painel/agenda");
  revalidatePath("/painel/clientes");
  redirect(
    `/painel/agendamentos/${data}?success=${encodeURIComponent("Agendamento criado.")}`,
  );
}

export async function setAppointmentStatus(formData: FormData) {
  const membership = await requireMembership();
  const id = uuid.safeParse(formData.get("appointment_id"));
  const status = z
    .enum(["CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .safeParse(formData.get("status"));
  if (!id.success || !status.success)
    fail("/painel/agendamentos", "Ação inválida.");
  if (
    membership.role === "PROFESSIONAL" &&
    !["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(status.data)
  ) {
    fail("/painel/minha-agenda", "Você não pode cancelar este agendamento.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_appointment_status", {
    p_appointment_id: id.data,
    p_status: status.data,
    p_cancellation_reason: String(formData.get("reason") ?? "") || undefined,
  });
  if (error)
    fail(`/painel/agendamentos/${id.data}`, appointmentError(error.message));
  revalidatePath("/painel");
  revalidatePath("/painel/agenda");
  revalidatePath(`/painel/agendamentos/${id.data}`);
  revalidatePath("/painel/clientes");
  redirect(
    `/painel/agendamentos/${id.data}?success=${encodeURIComponent("Status atualizado.")}`,
  );
}

export async function rescheduleAppointment(formData: FormData) {
  const membership = await requireOperator();
  const id = uuid.safeParse(formData.get("appointment_id"));
  const professional = uuid.safeParse(formData.get("professional_id"));
  const starts = dateTime.safeParse(formData.get("starts_at"));
  if (!id.success || !professional.success || !starts.success)
    fail("/painel/agendamentos", "Revise a nova data e horário.");
  const startsAt = fromZonedTime(
    starts.data,
    membership.businesses?.timezone ?? "America/Sao_Paulo",
  );
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: id.data,
    p_professional_id: professional.data,
    p_starts_at: startsAt.toISOString(),
  });
  if (error)
    fail(`/painel/agendamentos/${id.data}`, appointmentError(error.message));
  revalidatePath("/painel");
  revalidatePath("/painel/agenda");
  revalidatePath(`/painel/agendamentos/${id.data}`);
  redirect(
    `/painel/agendamentos/${id.data}?success=${encodeURIComponent("Agendamento reagendado.")}`,
  );
}

export async function updateAppointmentNote(formData: FormData) {
  await requireOperator();
  const id = uuid.safeParse(formData.get("appointment_id"));
  const notes = z.string().trim().max(2000).safeParse(formData.get("notes"));
  if (!id.success || !notes.success)
    fail("/painel/agendamentos", "Nota inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_appointment_note", {
    p_appointment_id: id.data,
    p_notes: notes.data,
  });
  if (error)
    fail(`/painel/agendamentos/${id.data}`, "Não foi possível salvar a nota.");
  revalidatePath(`/painel/agendamentos/${id.data}`);
  redirect(
    `/painel/agendamentos/${id.data}?success=${encodeURIComponent("Nota salva.")}`,
  );
}

export async function updateCustomerNotes(formData: FormData) {
  await requireOperator();
  const id = uuid.safeParse(formData.get("customer_id"));
  const notes = z.string().trim().max(4000).safeParse(formData.get("notes"));
  if (!id.success || !notes.success) fail("/painel/clientes", "Nota inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_customer_notes", {
    p_customer_id: id.data,
    p_notes: notes.data,
  });
  if (error)
    fail(`/painel/clientes/${id.data}`, "Não foi possível salvar as notas.");
  revalidatePath(`/painel/clientes/${id.data}`);
  redirect(
    `/painel/clientes/${id.data}?success=${encodeURIComponent("Notas salvas.")}`,
  );
}

const completionSchema = z.object({
  appointment_id: uuid,
  service_ids: z.array(uuid).min(1).max(20),
  payments: z
    .array(
      z.object({
        amount_cents: z.number().int().positive(),
        method: z.enum(["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD", "OTHER"]),
        notes: z.string().trim().max(500).optional(),
      }),
    )
    .max(10),
  discount_cents: z.number().int().min(0),
  discount_reason: z.string().trim().max(500).optional(),
});

export type CompletionState = { error?: string };

export async function completeAppointment(
  _state: CompletionState,
  formData: FormData,
): Promise<CompletionState> {
  await requireMembership();
  let serviceIds: unknown;
  let payments: unknown;
  try {
    serviceIds = JSON.parse(String(formData.get("service_ids") ?? "[]"));
    payments = JSON.parse(String(formData.get("payments") ?? "[]"));
  } catch {
    return { error: "Os dados do atendimento estão inválidos." };
  }
  const parsed = completionSchema.safeParse({
    appointment_id: formData.get("appointment_id"),
    service_ids: serviceIds,
    payments,
    discount_cents: Number(formData.get("discount_cents") ?? 0),
    discount_reason: String(formData.get("discount_reason") ?? ""),
  });
  if (!parsed.success) return { error: "Revise os serviços e pagamentos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_appointment", {
    p_appointment_id: parsed.data.appointment_id,
    p_service_ids: parsed.data.service_ids,
    p_payments: parsed.data.payments,
    p_discount_cents: parsed.data.discount_cents,
    p_discount_reason: parsed.data.discount_reason || undefined,
  });
  if (error) {
    if (error.message.includes("appointment_already_resolved"))
      return { error: "Este atendimento já foi confirmado por outra pessoa." };
    if (error.message.includes("payment_exceeds_total"))
      return { error: "O valor recebido não pode ser maior que o total." };
    if (error.message.includes("appointment_not_finished"))
      return { error: "O horário deste atendimento ainda não terminou." };
    return { error: "Não foi possível concluir o atendimento com segurança." };
  }
  revalidatePath("/painel");
  revalidatePath("/painel/minha-agenda");
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/relatorios");
  revalidatePath("/painel/clientes");
  redirect(
    `/painel/agendamentos/${parsed.data.appointment_id}?success=${encodeURIComponent("Atendimento concluído e lançado no financeiro.")}`,
  );
}

export async function resolveUnattendedAppointment(formData: FormData) {
  await requireMembership();
  const parsed = z
    .object({
      appointment_id: uuid,
      outcome: z.enum(["NO_SHOW", "CANCELLED"]),
      reason: z.string().trim().max(500).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/painel/minha-agenda", "Ação inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_unattended_appointment", {
    p_appointment_id: parsed.data.appointment_id,
    p_outcome: parsed.data.outcome,
    p_reason: parsed.data.reason || undefined,
  });
  if (error)
    fail(
      `/painel/agendamentos/${parsed.data.appointment_id}`,
      error.message.includes("appointment_already_resolved")
        ? "Este atendimento já foi resolvido."
        : "Não foi possível atualizar o atendimento.",
    );
  revalidatePath("/painel");
  revalidatePath("/painel/minha-agenda");
  revalidatePath("/painel/financeiro");
  redirect(
    `/painel/agendamentos/${parsed.data.appointment_id}?success=${encodeURIComponent(parsed.data.outcome === "NO_SHOW" ? "Falta registrada sem gerar receita." : "Atendimento cancelado sem gerar receita.")}`,
  );
}
