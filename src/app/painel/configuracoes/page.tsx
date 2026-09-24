import Link from "next/link";
import { updateBusiness } from "@/app/actions/business";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { requireOwner } from "@/lib/auth";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const membership = await requireOwner(); const query = await searchParams; const business = membership.businesses;
  if (!business) return null;
  return <><header className="page-header"><div><p className="eyebrow">Empresa</p><h1>Configurações</h1></div><Link className="button-ghost" href={`/${business.slug}`}>Ver página pública</Link></header><section className="panel-card form-card"><Notice {...query} /><form action={updateBusiness} className="form-stack"><label>Nome<input name="name" defaultValue={business.name} required /></label><label>Slug<input value={business.slug} disabled /><small>O slug não pode ser alterado nesta fase.</small></label><label>WhatsApp<input name="phone" defaultValue={business.phone} required /></label><label>URL do logo<input name="logo_url" type="url" defaultValue={business.logo_url ?? ""} /></label><label>Fuso horário<input name="timezone" defaultValue={business.timezone} required /></label><SubmitButton>Salvar configurações</SubmitButton></form></section></>;
}
