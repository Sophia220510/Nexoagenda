import Link from "next/link";

const features = [
  ["Agenda sem conflitos", "Disponibilidade calculada por profissional, duração e bloqueios."],
  ["Uma plataforma, várias empresas", "Dados isolados no banco com Row Level Security."],
  ["Reserva sem cadastro", "Uma experiência curta e clara para o cliente final."],
];

export default function Home() {
  return <main className="landing"><nav className="landing-nav"><Link href="/" className="brand brand-light">Nexo<span>Agenda</span></Link><div><Link href="/login">Entrar</Link><Link className="button button-light" href="/cadastro">Criar espaço</Link></div></nav>
    <section className="landing-hero"><div><p className="eyebrow eyebrow-light">Agenda inteligente para negócios de beleza</p><h1>Seu talento ocupa a cadeira.<br /><em>A agenda, a gente organiza.</em></h1><p>Uma base segura para barbearias e salões gerenciarem equipe, serviços, clientes e horários em um só lugar.</p><div className="hero-actions"><Link className="button button-light" href="/cadastro">Começar agora</Link><Link className="text-link" href="/login">Já tenho uma conta →</Link></div></div><div className="hero-visual"><div className="mock-window"><header><i /><i /><i /><span>Agenda de hoje</span></header><article><time>09:00</time><div><strong>Corte masculino</strong><small>Lucas · Rafael</small></div></article><article className="active"><time>10:30</time><div><strong>Corte + barba</strong><small>Pedro · André</small></div></article><article><time>13:15</time><div><strong>Barba</strong><small>Lucas · Marcos</small></div></article></div><div className="floating-note"><strong>15 min</strong><span>granularidade flexível</span></div></div></section>
    <section className="feature-strip">{features.map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{text}</p></article>)}</section>
    <footer className="landing-footer"><span>NexoAgenda</span><p>Fundação técnica para uma operação que cresce.</p></footer>
  </main>;
}
