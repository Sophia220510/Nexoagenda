import { NotificationFeed } from "@/components/notification-feed";
import { requirePlatformAdmin } from "@/lib/auth";
import { getNotifications } from "@/lib/notifications";

export default async function AdminNotificationsPage() {
  await requirePlatformAdmin();
  const items = await getNotifications({ limit: 150 });
  return <><header className="page-header notification-page-header"><div><p className="eyebrow">Toda a plataforma</p><h1>Notificações</h1><p className="muted">Atualizações de agendamentos, equipes, serviços e empresas.</p></div></header><NotificationFeed items={items} returnPath="/admin/notificacoes" showBusiness /></>;
}
