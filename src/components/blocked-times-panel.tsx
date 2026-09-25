import { removeBlockedTime } from "@/app/actions/business";
import { formatDateTime } from "@/lib/format";

interface ProfessionalOption { id: string; name: string }
interface BlockedTime { id: string; professional_id: string; starts_at: string; ends_at: string; reason: string | null; professionals: { name: string } | null }

export function BlockedTimesPanel({ blockedTimes, timezone }: { professionals: ProfessionalOption[]; blockedTimes: BlockedTime[]; timezone: string }) {
  return <section className="panel-card top-gap"><div className="section-title"><div><p className="eyebrow">Indisponibilidade</p><h2>Próximos bloqueios</h2></div><span className="count-badge">{blockedTimes.length}</span></div>
    {!blockedTimes.length ? <p className="empty compact-empty">Nenhum bloqueio futuro.</p> : <div className="list">{blockedTimes.map((item) => <article className="list-row blocked-list-row" key={item.id}><div><strong>{item.professionals?.name}</strong><p>{formatDateTime(item.starts_at, timezone)} até {formatDateTime(item.ends_at, timezone)}</p>{item.reason && <small>{item.reason}</small>}</div><form action={removeBlockedTime}><input type="hidden" name="id" value={item.id} /><button className="button-ghost">Remover</button></form></article>)}</div>}
  </section>;
}
