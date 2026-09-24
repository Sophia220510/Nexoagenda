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

export const getIsPlatformAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
});

export const getCurrentProfessional = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professionals")
    .select("id,business_id,user_id,name,photo_url,bio,active,setup_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o perfil profissional.");
  return data;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePasswordChanged() {
  const user=await requireAuth(); const supabase=await createClient(); const {data}=await supabase.from("login_identities").select("must_change_password,active").eq("user_id",user.id).maybeSingle();
  if(data&&!data.active){await supabase.auth.signOut();redirect("/login");}
  if(data?.must_change_password)redirect("/trocar-senha");
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

export async function requirePlatformAdmin() {
  await requireAuth();
  if (!(await getIsPlatformAdmin())) redirect("/acesso-negado");
}

export async function requireProfessional() {
  const membership = await requireMembership();
  if (membership.role !== "PROFESSIONAL") redirect("/painel");
  return membership;
}

export async function requireConfiguredProfessional() {
  const membership = await requireProfessional();
  const professional = await getCurrentProfessional();
  if (!professional?.setup_completed_at) redirect("/painel/configuracao-inicial");
  return { membership, professional };
}
