import Link from "next/link";
import { ArrowRight, CalendarCheck2, Check, Clock3, ContactRound, LayoutDashboard, Link2, UsersRound } from "lucide-react";
import { NexoBrand } from "@/components/nexo-brand";

const features = [
  [CalendarCheck2, "Agenda inteligente", "Disponibilidade real por profissional, duração, intervalos e bloqueios."],
  [UsersRound, "Gestão da equipe", "Cada profissional com serviços, horários e agenda próprios."],
  [Link2, "Página própria", "Um link simples para seus clientes reservarem sem criar conta."],
  [ContactRound, "Clientes organizados", "Histórico, próximos horários e relacionamento em um mini CRM."],
  [Clock3, "Horários automáticos", "O sistema só oferece o que realmente está disponível."],
  [LayoutDashboard, "Operação centralizada", "Dashboard, agenda, equipe e clientes no mesmo lugar."],
] as const;

export default function Home() {
  return <main className="landing-v2">
    <nav className="landing-v2-nav"><NexoBrand inverse /><div><Link href="/login">Entrar</Link><Link className="button button-lime" href="/cadastro">Criar meu espaço <ArrowRight size={17} /></Link></div></nav>
    <section className="landing-v2-hero"><div className="landing-copy"><p className="eyebrow eyebrow-light">Agenda inteligente para negócios e profissionais</p><h1>Seu negócio atende.<br /><em>A NEXO organiza o resto.</em></h1><p>Centralize agenda, equipe, clientes e horários em um sistema simples de usar — da reserva online à rotina do dia.</p><div className="hero-actions"><Link className="button button-lime" href="/cadastro">Criar meu espaço <ArrowRight size={18} /></Link><Link className="landing-login" href="/login">Já uso a NEXO</Link></div><div className="hero-proof"><span><Check /> Reserva sem cadastro</span><span><Check /> Sem conflito de horário</span><span><Check /> Feito para celular</span></div></div>
      <div className="product-preview"><header><span>NEXO Agenda</span><small>Hoje, 24 de setembro</small></header><div className="preview-body"><aside><i /><i /><i /><i /></aside><section><div className="preview-metrics"><article><small>Hoje</small><strong>12</strong></article><article><small>Ocupação</small><strong>78%</strong></article><article><small>Valor agendado</small><strong>R$ 840</strong></article></div><div className="preview-agenda"><p>Próximos atendimentos</p><article><time>09:00</time><b /><span><strong>Marina Costa</strong><small>Consulta · Ana</small></span></article><article className="active"><time>10:30</time><b /><span><strong>Pedro Lima</strong><small>Atendimento · Lucas</small></span></article><article><time>13:15</time><b /><span><strong>Bruno Alves</strong><small>Sessão individual · Bia</small></span></article></div></section></div><div className="preview-float"><CalendarCheck2 /><span><strong>Novo agendamento</strong><small>Horário confirmado</small></span></div></div>
    </section>
    <section className="how-section"><div className="landing-section-title"><p className="eyebrow">Comece sem complicação</p><h2>Do cadastro ao primeiro agendamento em três passos.</h2></div><div className="how-grid"><article><span>01</span><h3>Configure seu negócio</h3><p>Cadastre serviços, profissionais e horários de atendimento.</p></article><article><span>02</span><h3>Compartilhe seu link</h3><p>Use sua página NEXO no Instagram, WhatsApp ou Google.</p></article><article><span>03</span><h3>Receba agendamentos</h3><p>A agenda se organiza e sua equipe acompanha tudo em tempo real.</p></article></div></section>
    <section className="feature-section"><div className="landing-section-title"><p className="eyebrow">Tudo conectado</p><h2>Menos mensagens. Mais clareza na operação.</h2><p>Uma experiência profissional para você, sua equipe e seus clientes.</p></div><div className="feature-grid-v2">{features.map(([Icon, title, copy]) => <article key={title}><Icon /><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="segments"><p>Para quem trabalha com hora marcada</p><div><span>Barbearias</span><span>Clínicas</span><span>Consultórios</span><span>Estúdios</span><span>Personal trainers</span><span>Pet shops</span><span>Consultores</span><span>Profissionais autônomos</span></div></section>
    <section className="landing-cta"><NexoBrand compact /><h2>Seu próximo atendimento começa com uma agenda organizada.</h2><p>Crie seu espaço e deixe a NEXO cuidar da rotina.</p><Link className="button button-lime" href="/cadastro">Começar agora <ArrowRight size={18} /></Link></section>
    <footer className="landing-v2-footer"><NexoBrand inverse /><p>Agenda inteligente para negócios e profissionais.</p><Link href="/login">Entrar</Link></footer>
  </main>;
}
