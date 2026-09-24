import "server-only";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { PublicBusiness } from "@/types/domain";

export async function getPublicBusiness(slug: string) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("get_public_business", { p_slug: slug });
  if (error || !data) return null;
  return data as PublicBusiness;
}

