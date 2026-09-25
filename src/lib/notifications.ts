import "server-only";

import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  business_id: string;
  professional_id: string | null;
  kind: string;
  title: string;
  message: string;
  created_at: string;
  businesses: { name: string } | null;
  professionals: { name: string } | null;
  notification_reads: Array<{ user_id: string }>;
};

export async function getNotifications({ businessId, professionalId, team = false, limit = 100 }: {
  businessId?: string;
  professionalId?: string;
  team?: boolean;
  limit?: number;
}) {
  const supabase = await createClient();
  let query = supabase.from("notification_events")
    .select("id,business_id,professional_id,kind,title,message,created_at,businesses(name),professionals(name),notification_reads(user_id)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (businessId) query = query.eq("business_id", businessId);
  if (professionalId && !team) query = query.eq("professional_id", professionalId);
  if (professionalId && team) query = query.or(`professional_id.is.null,professional_id.neq.${professionalId}`);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as notificações.");
  return data as unknown as NotificationItem[];
}

export async function getUnreadNotificationCount({ businessId, professionalId }: { businessId?: string; professionalId?: string } = {}) {
  const supabase = await createClient();
  let query = supabase.from("notification_events")
    .select("id,notification_reads(user_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (businessId) query = query.eq("business_id", businessId);
  if (professionalId) query = query.eq("professional_id", professionalId);
  const { data, error } = await query;
  if (error) return 0;
  return (data ?? []).filter((item) => !item.notification_reads?.length).length;
}
