import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingFlow } from "@/components/booking-flow";
import { getPublicBusiness } from "@/lib/public-business";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const business = await getPublicBusiness(slug); if (!business) notFound();
  return <main className="booking-shell"><nav className="public-nav"><Link href={`/${business.slug}`} className="brand">← {business.name}</Link><span>Agendamento seguro</span></nav><header className="booking-header"><p className="eyebrow">Reserve seu horário</p><h1>Vamos encontrar o melhor momento.</h1><p>Não é necessário criar uma conta.</p></header><BookingFlow business={business} /></main>;
}
