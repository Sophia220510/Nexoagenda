import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManualBookingForm } from "@/components/manual-booking-form";
import { Notice } from "@/components/notice";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const membership = await requireOwner();
  const supabase = await createClient();
  const [customers, services, professionals] = await Promise.all([
    supabase.from("customers").select("id,name,phone").eq("business_id", membership.business_id).order("name"),
    supabase.from("services").select("id,name,price_cents,default_duration_minutes").eq("business_id", membership.business_id).eq("active", true).order("name"),
    supabase.from("professionals").select("id,name,professional_services(service_id,active)").eq("business_id", membership.business_id).eq("active", true).order("name"),
  ]);
  return <><div className="back-row"><Link href="/painel/agenda"><ArrowLeft size={17} /> Voltar para agenda</Link></div><Notice {...await searchParams} />
    <ManualBookingForm slug={membership.businesses?.slug ?? ""} timezone={membership.businesses?.timezone ?? "America/Sao_Paulo"} customers={customers.data ?? []} services={services.data ?? []} professionals={(professionals.data ?? []).map((p) => ({ id: p.id, name: p.name, serviceIds: (p.professional_services as Array<{ service_id: string; active: boolean }>).filter((item) => item.active).map((item) => item.service_id) }))} />
  </>;
}
