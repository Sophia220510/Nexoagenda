"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Clock3,
  ContactRound,
  ExternalLink,
  Home,
  ListPlus,
  LogOut,
  Menu,
  Scissors,
  Settings,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { NexoBrand } from "@/components/nexo-brand";
import type { Membership } from "@/types/domain";

const ownerLinks = [
  ["/painel", "Visão geral", Home],
  ["/painel/agenda", "Agenda", CalendarDays],
  ["/painel/agendamentos", "Agendamentos", Clock3],
  ["/painel/clientes", "Clientes", ContactRound],
  ["/painel/financeiro", "Financeiro", WalletCards],
  ["/painel/relatorios", "Relatórios", BarChart3],
  ["/painel/lista-de-espera", "Lista de espera", ListPlus],
  ["/painel/profissionais", "Profissionais", UsersRound],
  ["/painel/servicos", "Serviços", Scissors],
  ["/painel/notificacoes", "Notificações", Bell],
  ["/painel/configuracoes", "Configurações", Settings],
] as const;

const receptionistLinks = [
  ["/painel", "Visão geral", Home],
  ["/painel/agenda", "Agenda", CalendarDays],
  ["/painel/agendamentos", "Agendamentos", Clock3],
  ["/painel/clientes", "Clientes", ContactRound],
  ["/painel/financeiro", "Financeiro", WalletCards],
  ["/painel/relatorios", "Relatórios", BarChart3],
  ["/painel/lista-de-espera", "Lista de espera", ListPlus],
  ["/painel/notificacoes", "Notificações", Bell],
] as const;

const professionalLinks = [
  ["/painel/minha-agenda", "Minha agenda", CalendarDays],
  ["/painel/meus-horarios", "Meus horários", Clock3],
  ["/painel/notificacoes", "Notificações", Bell],
] as const;

export function DashboardNav({
  membership,
  unreadCount = 0,
  userName,
}: {
  membership: Membership;
  unreadCount?: number;
  userName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const owner = membership.role === "OWNER";
  const receptionist = membership.role === "RECEPTIONIST";
  const operator = owner || receptionist;
  const links = owner
    ? ownerLinks
    : receptionist
      ? receptionistLinks
      : professionalLinks;
  const active = (href: string) =>
    href === "/painel" ? pathname === href : pathname.startsWith(href);
  return (
    <>
      <aside className={`sidebar ${open ? "mobile-open" : ""}`}>
        <div className="sidebar-head">
          <NexoBrand href="/painel" inverse />
          <button
            className="sidebar-close"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
          <p>{membership.businesses?.name}</p>
        </div>
        <nav className="sidebar-links" aria-label="Navegação principal">
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
          {operator && (
            <Link href={`/${membership.businesses?.slug}`} target="_blank">
              <ExternalLink size={18} />
              <span>Página pública</span>
            </Link>
          )}
        </nav>
        <div className="sidebar-user">
          <span>{userName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{userName}</strong>
            <small>
              {owner
                ? "Proprietário"
                : receptionist
                  ? "Recepção"
                  : "Profissional"}
            </small>
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
      <header className="mobile-topbar">
        <NexoBrand href="/painel" compact />
        <button onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
      </header>
      <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
        <Link href="/painel" className={pathname === "/painel" ? "active" : ""}>
          <Home />
          <span>Início</span>
        </Link>
        <Link
          href={operator ? "/painel/agenda" : "/painel/minha-agenda"}
          className={pathname.includes("agenda") ? "active" : ""}
        >
          <CalendarDays />
          <span>Agenda</span>
        </Link>
        {operator ? (
          <Link
            href="/painel/financeiro"
            className={
              pathname.startsWith("/painel/financeiro") ? "active" : ""
            }
          >
            <WalletCards />
            <span>Financeiro</span>
          </Link>
        ) : (
          <Link
            href="/painel/notificacoes"
            className={pathname.includes("notificacoes") ? "active" : ""}
          >
            <Bell />
            <span>Avisos</span>
          </Link>
        )}
        <button onClick={() => setOpen(true)}>
          <Menu />
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}
