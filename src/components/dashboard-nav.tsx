import Link from "next/link";
import { logout } from "@/app/actions/auth";
import type { Membership } from "@/types/domain";

export function DashboardNav({ membership }: { membership: Membership }) {
  const owner = membership.role === "OWNER";
  return (
    <aside className="sidebar">
      <div><Link href="/painel" className="brand brand-light">Nexo<span>Agenda</span></Link><p className="business-name">{membership.businesses?.name}</p></div>
      <nav>
        {owner ? <>
          <Link href="/painel">Visão geral</Link>
          <Link href="/painel/agenda">Agenda</Link>
          <Link href="/painel/profissionais">Profissionais</Link>
          <Link href="/painel/servicos">Serviços</Link>
          <Link href="/painel/clientes">Clientes</Link>
          <Link href="/painel/configuracoes">Configurações</Link>
        </> : <Link href="/painel/minha-agenda">Minha agenda</Link>}
      </nav>
      <form action={logout}><button className="sidebar-logout">Sair</button></form>
    </aside>
  );
}

