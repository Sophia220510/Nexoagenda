"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const idsSchema = z.array(z.string().uuid()).min(1).max(200);

function safePath(value: FormDataEntryValue | null) {
  const path = String(value ?? "");
  return path.startsWith("/admin/notificacoes") ? "/admin/notificacoes" : "/painel/notificacoes";
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireAuth();
  const id = z.string().uuid().safeParse(formData.get("notification_id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("notification_reads").upsert({ notification_id: id.data, user_id: user.id });
  revalidatePath(safePath(formData.get("return_path")));
  revalidatePath("/painel", "layout");
  revalidatePath("/admin", "layout");
}

export async function markAllNotificationsRead(formData: FormData) {
  const user = await requireAuth();
  let raw: unknown;
  try { raw = JSON.parse(String(formData.get("notification_ids") ?? "[]")); } catch { return; }
  const ids = idsSchema.safeParse(raw);
  if (!ids.success) return;
  const supabase = await createClient();
  await supabase.from("notification_reads").upsert(ids.data.map((notification_id) => ({ notification_id, user_id: user.id })));
  revalidatePath(safePath(formData.get("return_path")));
  revalidatePath("/painel", "layout");
  revalidatePath("/admin", "layout");
}
