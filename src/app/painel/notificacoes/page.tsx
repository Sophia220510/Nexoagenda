import Link from "next/link";
import { NotificationFeed } from "@/components/notification-feed";
import { getCurrentProfessional, requireMembership } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const membership = await requireMembership();
  const professional = await getCurrentProfessional();
  const query = await searchParams;
  const owner = membership.role === "OWNER";
  const scope = owner && query.scope === "team" ? "team" : "mine";
  const [mineItems, teamItems] = owner && professional ? await Promise.all([
    getNotifications({ businessId: membership.business_id, professionalId: professional.id }),
    getNotifications({ businessId: membership.business_id, professionalId: professional.id, team: true }),
  ]) : [await getNotifications({ businessId: membership.business_id, professionalId: professional?.id }), []];
  const items = scope === "team" ? teamItems : mineItems;
  const mineUnread = mineItems.filter((item) => !item.notification_reads.length).length;
  const teamUnread = teamItems.filter((item) => !item.notification_reads.length).length;
  const path = `/painel/notificacoes${scope === "team" ? "?scope=team" : ""}`;
  return <><header className="page-header notification-page-header"><div><p className="eyebrow">Central de atividades</p><h1>Notificações</h1><p className="muted">Acompanhe agendamentos, bloqueios e alterações importantes.</p></div></header>{owner && <nav className="notification-tabs" aria-label="Tipos de notificação"><Link className={scope === "mine" ? "active" : ""} href="/painel/notificacoes">Minhas notificações{mineUnread > 0 && <span>{mineUnread}</span>}</Link><Link className={scope === "team" ? "active" : ""} href="/painel/notificacoes?scope=team">Equipe{teamUnread > 0 && <span>{teamUnread}</span>}</Link></nav>}<NotificationFeed items={items} returnPath={path} /></>;
}
