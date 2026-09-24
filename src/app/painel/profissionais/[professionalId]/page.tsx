import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { ProfessionalSetupWizard } from "@/components/professional-setup-wizard";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProfessionalDetailPage({ params, searchParams }: { params: Promise<{ professionalId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const membership = await requireOwner(); const { professionalId } = await params; const supabase = await createClient();
  const [professionalResult, services, assigned, hours, blocks] = await Promise.all([
    supabase.from("professionals").select("id,name,business_id").eq("id", professionalId).eq("business_id", membership.business_id).maybeSingle(),
    supabase.from("services").select("id,name,default_duration_minutes").eq("business_id", membership.business_id).eq("active", true).order("name"),
    supabase.from("professional_services").select("service_id,duration_override_minutes,active").eq("professional_id", professionalId),
    supabase.from("working_hours").select("weekday,start_time,end_time").eq("professional_id", professionalId).eq("active", true),
    supabase.from("recurring_blocks").select("weekday,start_time,end_time,reason").eq("professional_id", professionalId).eq("active", true),
  ]);
  if (!professionalResult.data) notFound();
  return <><header className="page-header"><div><p className="eyebrow">Configuração profissional</p><h1>{professionalResult.data.name}</h1><p className="muted">Defina serviços, duração individual, jornada e pausas fixas.</p></div></header><Notice {...await searchParams} /><ProfessionalSetupWizard ownerMode professionalId={professionalId} services={services.data ?? []} assigned={assigned.data ?? []} hours={hours.data ?? []} blocks={blocks.data ?? []} /></>;
}
