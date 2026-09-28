"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator, requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const paymentMethod = z.enum([
  "PIX",
  "CASH",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "OTHER",
]);

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function recordExpense(formData: FormData) {
  await requireOperator();
  const amountCents = Math.round(
    Number(String(formData.get("amount") ?? "").replace(",", ".")) * 100,
  );
  const parsed = z
    .object({
      description: z.string().trim().min(2).max(160),
      category: z.enum([
        "MATERIAL",
        "RENT",
        "PRODUCTS",
        "MARKETING",
        "MAINTENANCE",
        "SALARIES",
        "OTHER",
      ]),
      expense_date: z.string().date(),
      method: z.union([z.literal(""), paymentMethod]),
      notes: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success || !Number.isInteger(amountCents) || amountCents <= 0)
    fail("/painel/financeiro/despesas", "Revise os dados da despesa.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_expense", {
    p_description: parsed.data.description,
    p_category: parsed.data.category,
    p_amount_cents: amountCents,
    p_expense_date: parsed.data.expense_date,
    p_method: parsed.data.method || undefined,
    p_notes: parsed.data.notes || undefined,
  });
  if (error)
    fail(
      "/painel/financeiro/despesas",
      "Não foi possível registrar a despesa.",
    );
  revalidatePath("/painel");
  revalidatePath("/painel/financeiro");
  redirect(
    `/painel/financeiro/despesas?success=${encodeURIComponent("Despesa registrada e auditada.")}`,
  );
}

export async function saveCommissionRule(formData: FormData) {
  const membership = await requireOwner();
  const parsed = z
    .object({
      professional_id: z.string().uuid(),
      service_id: z.union([z.literal(""), z.string().uuid()]),
      type: z.enum(["PERCENTAGE", "FIXED"]),
      value: z.coerce.number().min(0),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    fail("/painel/financeiro/comissoes", "Revise a regra de comissão.");
  const value =
    parsed.data.type === "PERCENTAGE"
      ? Math.round(parsed.data.value * 100)
      : Math.round(parsed.data.value * 100);
  if (parsed.data.type === "PERCENTAGE" && value > 10000)
    fail(
      "/painel/financeiro/comissoes",
      "A comissão percentual não pode passar de 100%.",
    );
  const supabase = await createClient();
  let existing = supabase
    .from("professional_commission_rules")
    .select("id")
    .eq("business_id", membership.business_id)
    .eq("professional_id", parsed.data.professional_id);
  existing = parsed.data.service_id
    ? existing.eq("service_id", parsed.data.service_id)
    : existing.is("service_id", null);
  const { data } = await existing.maybeSingle();
  const payload = {
    business_id: membership.business_id,
    professional_id: parsed.data.professional_id,
    service_id: parsed.data.service_id || null,
    type: parsed.data.type,
    value,
    active: true,
  };
  const result = data
    ? await supabase
        .from("professional_commission_rules")
        .update(payload)
        .eq("id", data.id)
    : await supabase.from("professional_commission_rules").insert(payload);
  if (result.error)
    fail("/painel/financeiro/comissoes", "Não foi possível salvar a regra.");
  revalidatePath("/painel/financeiro/comissoes");
  redirect(
    `/painel/financeiro/comissoes?success=${encodeURIComponent("Regra de comissão salva.")}`,
  );
}

export async function markCommissionPaid(formData: FormData) {
  await requireOwner();
  const parsed = z.string().uuid().safeParse(formData.get("commission_id"));
  if (!parsed.success)
    fail("/painel/financeiro/comissoes", "Comissão inválida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_commission_paid", {
    p_commission_id: parsed.data,
  });
  if (error)
    fail(
      "/painel/financeiro/comissoes",
      "Não foi possível marcar a comissão como paga.",
    );
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/financeiro/comissoes");
  redirect(
    `/painel/financeiro/comissoes?success=${encodeURIComponent("Comissão marcada como paga.")}`,
  );
}

export async function updateProfessionalFinancialModel(formData: FormData) {
  await requireOwner();
  const parsed = z.object({
    professional_id: z.string().uuid(),
    financial_model: z.enum([
      "PROFESSIONAL_KEEPS_ALL",
      "BUSINESS_KEEPS_ALL",
      "PERCENTAGE_COMMISSION",
      "FIXED_COMMISSION",
    ]),
    payment_receiver: z.enum(["BUSINESS", "PROFESSIONAL"]),
    financial_value: z.coerce.number().min(0),
    pix_key: z.string().trim().max(180).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    fail("/painel/equipe", "Revise a configuração financeira do profissional.");
  const value = parsed.data.financial_model === "PERCENTAGE_COMMISSION"
    ? Math.round(parsed.data.financial_value * 100)
    : parsed.data.financial_model === "FIXED_COMMISSION"
      ? Math.round(parsed.data.financial_value * 100)
      : 0;
  if (parsed.data.financial_model === "PERCENTAGE_COMMISSION" && value > 10000)
    fail(`/painel/equipe/${parsed.data.professional_id}`, "O percentual não pode passar de 100%.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_professional_financial_model", {
    p_professional_id: parsed.data.professional_id,
    p_financial_model: parsed.data.financial_model,
    p_financial_value: value,
    p_payment_receiver: parsed.data.payment_receiver,
    p_pix_key: parsed.data.pix_key || undefined,
  });
  if (error) fail(`/painel/equipe/${parsed.data.professional_id}`, "Não foi possível salvar o modelo financeiro.");
  revalidatePath("/painel/equipe");
  revalidatePath(`/painel/equipe/${parsed.data.professional_id}`);
  redirect(`/painel/equipe/${parsed.data.professional_id}?success=${encodeURIComponent("Configuração financeira salva.")}`);
}
