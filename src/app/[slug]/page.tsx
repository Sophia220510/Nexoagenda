import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { getPublicBusiness } from "@/lib/public-business";

export default async function PublicBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const business = await getPublicBusiness(slug); if (!business) notFound();
  return <main className="public-shell"><nav className="public-nav"><Link href="/" className="brand">Nexo<span>Agenda</span></Link><a href={`https://wa.me/${business.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Falar no WhatsApp</a></nav>
    <header className="business-hero">{business.logo_url && <Image src={business.logo_url} width={88} height={88} alt={`Logo ${business.name}`} className="business-logo" unoptimized />}<p className="eyebrow">Agendamento online</p><h1>{business.name}</h1><p>Escolha o serviço, profissional e o melhor horário para você.</p><Link className="button" href={`/${business.slug}/agendar`}>Agendar agora</Link></header>
    <section className="public-section"><div className="section-title"><div><p className="eyebrow">Catálogo</p><h2>Serviços</h2></div></div><div className="public-grid">{business.services.map((service) => <article className="public-card" key={service.id}><h3>{service.name}</h3><p>{service.description}</p><footer><strong>{formatCurrency(service.price_cents)}</strong><span>{service.default_duration_minutes} min</span></footer></article>)}</div></section>
    <section className="public-section"><div className="section-title"><div><p className="eyebrow">Equipe</p><h2>Profissionais</h2></div></div><div className="public-grid">{business.professionals.map((professional) => <article className="public-card" key={professional.id}><h3>{professional.name}</h3><p>{professional.bio || "Profissional da equipe."}</p></article>)}</div></section>
  </main>;
}
