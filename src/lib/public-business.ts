import "server-only";
import { cache } from "react";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import type { PublicBusiness } from "@/types/domain";

export const getPublicBusiness = cache(async (slug: string) => {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("get_public_business", {
    p_slug: slug,
  });
  if (error || !data) return null;
  return data as unknown as PublicBusiness;
});
