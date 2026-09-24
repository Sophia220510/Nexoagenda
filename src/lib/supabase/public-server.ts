import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createPublicServerClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
