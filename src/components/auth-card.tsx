import Link from "next/link";

export function AuthCard({ title, description, children, footer }: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <Link href="/" className="brand">Nexo<span>Agenda</span></Link>
      <section className="auth-card">
        <div><p className="eyebrow">Agenda profissional</p><h1>{title}</h1><p className="muted">{description}</p></div>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </section>
    </main>
  );
}

