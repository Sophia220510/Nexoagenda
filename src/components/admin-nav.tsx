"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";
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
import { AccountSwitcher } from "@/components/account-switcher";
import type { SavedAccount } from "@/lib/saved-accounts";

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

export function AdminNav({
  unreadCount = 0,
  savedAccounts,
  currentUserId,
  userName,
}: {
  unreadCount?: number;
  savedAccounts: SavedAccount[];
  currentUserId?: string;
  userName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);
  const sectionFor = (href: string) => {
    if (href === "/admin") return "Plataforma";
    if (href.includes("empresas") || href.includes("usuarios") || href.includes("profissionais") || href.includes("clientes")) return "Cadastros";
    if (href.includes("agendamentos") || href.includes("notificacoes")) return "Operação";
    return "Sistema";
  };
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
          {links.map(([href, label, Icon], index) => {
            const section = sectionFor(href);
            const previousSection = index > 0 ? sectionFor(links[index - 1][0]) : "";
            return (
              <Fragment key={href}>
                {section !== previousSection && <small className="sidebar-section-label">{section}</small>}
                <Link href={href} className={active(href) ? "active" : ""} onClick={() => setOpen(false)}>
                  <Icon size={18} />
                  <span>{label}</span>
                  {href.includes("notificacoes") && unreadCount > 0 && <b>{unreadCount > 99 ? "99+" : unreadCount}</b>}
                </Link>
              </Fragment>
            );
          })}
        </nav>
        <div className="sidebar-user admin-user">
          <span>
            <ShieldCheck size={19} />
          </span>
          <div>
            <strong>{userName}</strong>
            <small>Plataforma NEXO</small>
          </div>
          <AccountSwitcher
            accounts={savedAccounts}
            currentUserId={currentUserId}
          />
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
