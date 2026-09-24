import { Notice } from "@/components/notice";
import { ProfessionalSetupWizard } from "@/components/professional-setup-wizard";
import { getCurrentProfessional, requireProfessional } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InitialConfigurationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireProfessional();
  const professional = await getCurrentProfessional();
  if (!professional) redirect("/acesso-negado");
  const supabase = await createClient();
  const [services, assigned, hours, blocks] = await Promise.all([
    supabase.from("services").select("id,name,default_duration_minutes").eq("business_id", professional.business_id).eq("active", true).order("name"),
    supabase.from("professional_services").select("service_id,duration_override_minutes,active").eq("professional_id", professional.id),
    supabase.from("working_hours").select("weekday,start_time,end_time").eq("professional_id", professional.id).eq("active", true),
    supabase.from("recurring_blocks").select("weekday,start_time,end_time,reason").eq("professional_id", professional.id).eq("active", true),
  ]);
  return <><header className="page-header"><div><p className="eyebrow">Primeiro acesso</p><h1>Prepare sua agenda</h1><p className="muted">Leva poucos minutos. Você poderá alterar tudo depois.</p></div></header><Notice {...await searchParams} /><ProfessionalSetupWizard professionalId={professional.id} services={services.data ?? []} assigned={assigned.data ?? []} hours={hours.data ?? []} blocks={blocks.data ?? []} /></>;
}
