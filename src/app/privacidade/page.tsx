import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Privacidade", alternates: { canonical: absoluteUrl("/privacidade") } };

export default function PrivacyPage() {
  return <LegalPage title="Privacidade" intro="Esta página explica, em linguagem simples, como os dados são usados no NEXO Book durante a operação da plataforma.">
    <section><h2>Dados tratados</h2><p>Tratamos dados de conta e autenticação, informações dos estabelecimentos e profissionais, dados de clientes inseridos pelos negócios para realizar agendamentos e dados técnicos necessários para segurança e funcionamento. O estabelecimento informa os dados dos seus clientes no contexto de sua própria atividade.</p></section>
    <section><h2>Para que usamos</h2><p>Usamos essas informações para identificar usuários, disponibilizar agenda e reservas, operar o atendimento, proteger o serviço e resolver problemas. Não pedimos dados de pagamento na página pública de agendamento.</p></section>
    <section><h2>Cookies e análise de uso</h2><p>Cookies de autenticação são necessários para manter a sessão. Utilizamos métricas agregadas de uso para avaliar a qualidade do site; não há pixel de publicidade instalado nesta versão.</p></section>
    <section><h2>Segurança, retenção e direitos</h2><p>Adotamos controles de acesso por conta e estabelecimento, comunicação HTTPS e regras de acesso no banco. Os dados são mantidos enquanto necessários à prestação do serviço ou ao cumprimento de obrigações aplicáveis. Você pode solicitar informações, correção ou exclusão pelos canais de contato; pedidos referentes a dados inseridos por um estabelecimento também podem ser dirigidos a ele.</p></section>
    <section><h2>Contato e revisão</h2><p>Veja a página de contato para o canal de atendimento disponível. Este texto é uma versão inicial para pilotos e precisa de revisão jurídica antes de uma expansão comercial, especialmente quanto a controlador/operador, bases legais, retenção e compartilhamentos.</p></section>
  </LegalPage>;
}
