import Link from "next/link";
import { logout } from "@/app/actions/auth";

export function AdminNav({ unreadCount = 0 }: { unreadCount?: number }) {
  return <aside className="sidebar admin-sidebar"><div><Link href="/admin" className="brand brand-light">NEXO<span>ADMIN</span></Link><p className="business-name">Gestão da plataforma</p></div><nav><Link href="/admin">Visão geral</Link><Link href="/admin/empresas">Estabelecimentos</Link><Link href="/admin/usuarios">Usuários</Link><Link href="/admin/profissionais">Profissionais</Link><Link href="/admin/clientes">Clientes</Link><Link href="/admin/agendamentos">Agendamentos</Link><Link href="/admin/notificacoes" className="nav-notification-link">Notificações{unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link><Link href="/admin/configuracoes">Configurações</Link></nav><form action={logout}><button className="sidebar-logout">Sair</button></form></aside>;
}
