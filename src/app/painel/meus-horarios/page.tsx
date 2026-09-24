import { Notice } from "@/components/notice";
import { ProfessionalSetupWizard } from "@/components/professional-setup-wizard";
import { requireConfiguredProfessional } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MyHoursPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { professional } = await requireConfiguredProfessional();
  const supabase = await createClient();
  const [services, assigned, hours, blocks] = await Promise.all([
    supabase.from("services").select("id,name,default_duration_minutes").eq("business_id", professional.business_id).eq("active", true).order("name"),
    supabase.from("professional_services").select("service_id,duration_override_minutes,active").eq("professional_id", professional.id),
    supabase.from("working_hours").select("weekday,start_time,end_time").eq("professional_id", professional.id).eq("active", true),
    supabase.from("recurring_blocks").select("weekday,start_time,end_time,reason").eq("professional_id", professional.id).eq("active", true),
  ]);
  return <><header className="page-header"><div><p className="eyebrow">Disponibilidade</p><h1>Meus horários</h1><p className="muted">Ajuste serviços, duração, jornada e intervalos fixos.</p></div></header><Notice {...await searchParams} /><ProfessionalSetupWizard professionalId={professional.id} services={services.data ?? []} assigned={assigned.data ?? []} hours={hours.data ?? []} blocks={blocks.data ?? []} /></>;
}
