import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import type { NotificationItem } from "@/lib/notifications";

const icons: Record<string, string> = {
  APPOINTMENT_CREATED: "✓",
  APPOINTMENT_STATUS: "↻",
  BLOCK_CREATED: "⊘",
  BLOCK_REMOVED: "↗",
  BUSINESS_UPDATED: "◆",
  PROFESSIONAL_CREATED: "+",
  PROFESSIONAL_UPDATED: "♟",
  SERVICE_CREATED: "+",
  SERVICE_UPDATED: "✦",
};

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function NotificationFeed({ items, returnPath, showBusiness = false }: { items: NotificationItem[]; returnPath: string; showBusiness?: boolean }) {
  const unread = items.filter((item) => !item.notification_reads.length);
  return <section className="notification-panel">
    <div className="notification-panel-head"><div><strong>{unread.length}</strong><span>não lidas</span></div>{unread.length > 0 && <form action={markAllNotificationsRead}><input type="hidden" name="notification_ids" value={JSON.stringify(unread.map((item) => item.id))} /><input type="hidden" name="return_path" value={returnPath} /><button className="button-ghost">Marcar todas como lidas</button></form>}</div>
    {!items.length ? <div className="notification-empty"><span>✓</span><h2>Tudo tranquilo por aqui</h2><p>As novas atualizações aparecerão nesta página.</p></div> : <div className="notification-list">{items.map((item) => {
      const read = item.notification_reads.length > 0;
      return <article className={read ? "notification-item read" : "notification-item unread"} key={item.id}>
        <div className={`notification-icon kind-${item.kind.toLowerCase()}`}>{icons[item.kind] ?? "•"}</div>
        <div className="notification-copy"><div className="notification-title"><h3>{item.title}</h3>{!read && <span>NOVA</span>}</div><p>{item.message}</p><footer>{showBusiness && item.businesses?.name && <b>{item.businesses.name}</b>}{item.professionals?.name && <b>{item.professionals.name}</b>}<time dateTime={item.created_at}>{relativeTime(item.created_at)}</time></footer></div>
        {!read && <form action={markNotificationRead}><input type="hidden" name="notification_id" value={item.id} /><input type="hidden" name="return_path" value={returnPath} /><button className="notification-read-button" aria-label={`Marcar ${item.title} como lida`} title="Marcar como lida">✓</button></form>}
      </article>;
    })}</div>}
  </section>;
}
