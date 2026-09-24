import Link from "next/link";

export default function AccessDeniedPage() {
  return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">Acesso restrito</p><h1>Acesso negado</h1><p className="muted">Sua conta não possui permissão para abrir esta área.</p><Link className="button" href="/">Voltar ao início</Link></section></main>;
}
