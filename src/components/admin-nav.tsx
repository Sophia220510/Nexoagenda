"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ContactRound,
  Gauge,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { NexoBrand } from "@/components/nexo-brand";

const links = [
  ["/admin", "Visão geral", Gauge],
  ["/admin/empresas", "Estabelecimentos", Building2],
  ["/admin/usuarios", "Usuários", UserRoundCog],
  ["/admin/profissionais", "Profissionais", UsersRound],
  ["/admin/clientes", "Clientes", ContactRound],
  ["/admin/agendamentos", "Agendamentos", CalendarDays],
  ["/admin/notificacoes", "Notificações", Bell],
  ["/admin/configuracoes", "Configurações", Settings],
] as const;

export function AdminNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);
  return (
    <>
      <aside className={`sidebar admin-sidebar ${open ? "mobile-open" : ""}`}>
        <div className="sidebar-head">
          <NexoBrand href="/admin" inverse />
          <button
            className="sidebar-close"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
          <p>Gestão da plataforma</p>
        </div>
        <nav className="sidebar-links" aria-label="Navegação administrativa">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={active(href) ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {href.includes("notificacoes") && unreadCount > 0 && (
                <b>{unreadCount > 99 ? "99+" : unreadCount}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-user admin-user">
          <span>
            <ShieldCheck size={19} />
          </span>
          <div>
            <strong>Master Admin</strong>
            <small>Plataforma NEXO</small>
          </div>
          <form action={logout}>
            <button aria-label="Sair">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <header className="mobile-topbar admin-mobile-topbar">
        <NexoBrand href="/admin" compact />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu administrativo"
        >
          <Menu size={22} />
        </button>
      </header>
    </>
  );
}
