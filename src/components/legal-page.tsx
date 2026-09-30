import Link from "next/link";
import { NexoBrand } from "@/components/nexo-brand";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="legal-shell">
      <nav className="legal-nav"><NexoBrand /><Link href="/">Voltar ao início</Link></nav>
      <article className="legal-content">
        <p className="eyebrow">NEXO Book</p>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        {children}
      </article>
      <footer className="legal-footer"><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link><Link href="/contato">Contato</Link></footer>
    </main>
  );
}
