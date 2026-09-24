import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/types/domain";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

export const getCurrentBusiness = cache(async (): Promise<Membership | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_members")
    .select("id,business_id,user_id,role,businesses(id,name,slug,phone,logo_url,timezone,active)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar a empresa atual.");
  return data as unknown as Membership | null;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireMembership() {
  await requireAuth();
  const membership = await getCurrentBusiness();
  if (!membership) redirect("/onboarding");
  return membership;
}

export async function requireOwner() {
  const membership = await requireMembership();
  if (membership.role !== "OWNER") redirect("/painel/minha-agenda");
  return membership;
}

export async function requireProfessional() {
  const membership = await requireMembership();
  if (membership.role !== "PROFESSIONAL") redirect("/painel");
  return membership;
}

