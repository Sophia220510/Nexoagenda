import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/lib/env";

export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY não configurada no servidor.");
  return createClient<Database>(getSupabaseEnv().url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
