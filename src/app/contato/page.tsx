import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Contato",
  alternates: { canonical: absoluteUrl("/contato") },
  robots: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ? undefined : { index: false, follow: false },
};

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return <LegalPage title="Contato" intro="Precisa de ajuda com o NEXO Book ou quer falar sobre seus dados?">
    {email ? <section><h2>Fale com a equipe</h2><p>Escreva para <a href={`mailto:${email}`}>{email}</a>. Descreva sua dúvida sem enviar senhas ou dados sensíveis de clientes.</p></section> : <section><h2>Atendimento em configuração</h2><p>O canal público de suporte ainda não foi configurado. Se você participa do piloto, utilize o contato da equipe que convidou seu estabelecimento.</p></section>}
  </LegalPage>;
}
