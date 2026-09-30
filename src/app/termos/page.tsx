import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: absoluteUrl("/termos") } };

export default function TermsPage() {
  return <LegalPage title="Termos de uso" intro="Regras básicas para o uso da plataforma NEXO Book em sua fase piloto.">
    <section><h2>Uso da plataforma</h2><p>O NEXO Book oferece ferramentas de agenda, gestão e reserva online. Cada estabelecimento é responsável pelos serviços que anuncia, disponibilidade, preços, informações fornecidas aos clientes e atendimento prestado.</p></section>
    <section><h2>Contas e acesso</h2><p>O usuário deve manter suas credenciais em segurança e conceder acesso apenas a pessoas autorizadas. Atividades realizadas em uma conta devem respeitar as permissões atribuídas pelo estabelecimento.</p></section>
    <section><h2>Uso aceitável</h2><p>Não utilize a plataforma para fins ilícitos, envio de conteúdo abusivo, tentativas de acesso a dados de terceiros ou sobrecarga deliberada do serviço.</p></section>
    <section><h2>Disponibilidade e limites</h2><p>Buscamos manter o serviço disponível, mas podem ocorrer manutenção e falhas. O NEXO Book não substitui a conferência operacional dos agendamentos pelo estabelecimento. Não prometemos disponibilidade ininterrupta.</p></section>
    <section><h2>Cancelamento e alterações</h2><p>Condições comerciais, cancelamento de contas e eventual cobrança devem ser informados diretamente pelo canal de atendimento antes de contratação. Podemos atualizar estes termos e comunicar mudanças relevantes pelos canais da plataforma.</p></section>
    <section><h2>Propriedade intelectual e contato</h2><p>A marca e o software NEXO Book pertencem aos seus respectivos titulares. Para dúvidas, acesse a página de contato. Este é um documento inicial para pilotos, ainda pendente de revisão jurídica antes da escala comercial.</p></section>
  </LegalPage>;
}
