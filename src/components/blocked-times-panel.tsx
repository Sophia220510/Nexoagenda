import { createBlockedTime, removeBlockedTime } from "@/app/actions/business";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";

interface ProfessionalOption { id: string; name: string }
interface BlockedTime { id: string; professional_id: string; starts_at: string; ends_at: string; reason: string | null; professionals: { name: string } | null }

export function BlockedTimesPanel({ professionals, blockedTimes, timezone }: { professionals: ProfessionalOption[]; blockedTimes: BlockedTime[]; timezone: string }) {
  return <section className="panel-card top-gap"><div className="section-title"><div><p className="eyebrow">Indisponibilidade</p><h2>Bloqueios</h2></div></div>
    {!professionals.length ? <p className="empty">Nenhum perfil profissional vinculado.</p> : <form action={createBlockedTime} className="inline-form block-form"><label>Profissional<select name="professional_id">{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Início<input name="starts_at" type="datetime-local" required /></label><label>Fim<input name="ends_at" type="datetime-local" required /></label><label>Motivo<input name="reason" maxLength={500} /></label><SubmitButton>Bloquear</SubmitButton></form>}
    {!!blockedTimes.length && <div className="list top-gap">{blockedTimes.map((item) => <article className="list-row" key={item.id}><div><strong>{item.professionals?.name}</strong><p>{formatDateTime(item.starts_at, timezone)} até {formatDateTime(item.ends_at, timezone)}</p></div><form action={removeBlockedTime}><input type="hidden" name="id" value={item.id} /><button className="button-ghost">Remover</button></form></article>)}</div>}
  </section>;
}
