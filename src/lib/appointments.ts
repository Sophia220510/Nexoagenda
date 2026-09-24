import "server-only";
import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";

export async function getAppointmentsForDate(businessId: string, date: string, timezone: string) {
  const start = fromZonedTime(`${date} 00:00:00`, timezone);
  const end = addDays(start, 1);
  const supabase = await createClient();
  const { data, error } = await supabase.from("appointments")
    .select("id,starts_at,ends_at,status,customers(name,phone),services(name),professionals(name)")
    .eq("business_id", businessId).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString()).order("starts_at");
  if (error) throw new Error("Não foi possível carregar a agenda.");
  return data as unknown as Array<{ id: string; starts_at: string; ends_at: string; status: string; customers: { name: string; phone: string } | null; services: { name: string } | null; professionals: { name: string } | null }>;
}
