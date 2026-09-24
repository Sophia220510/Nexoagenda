import Link from "next/link";
import { formatDateTime } from "@/lib/format";

interface AppointmentRow {
  id: string; starts_at: string; ends_at: string; status: string;
  customers: { name: string; phone: string } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
}

export function AgendaList({ rows, timezone, date, basePath }: { rows: AppointmentRow[]; timezone: string; date: string; basePath: string }) {
  const current = new Date(`${date}T12:00:00Z`);
  const previous = new Date(current); previous.setUTCDate(previous.getUTCDate() - 1);
  const next = new Date(current); next.setUTCDate(next.getUTCDate() + 1);
  const iso = (value: Date) => value.toISOString().slice(0, 10);
  return <>
    <div className="date-nav"><Link href={`${basePath}?date=${iso(previous)}`}>← Anterior</Link><Link href={basePath}>Hoje</Link><Link href={`${basePath}?date=${iso(next)}`}>Próxima →</Link></div>
    <section className="panel-card">
      {!rows.length ? <p className="empty">Nenhum horário encontrado nesta data.</p> : <div className="list">{rows.map((item) => <article className="list-row" key={item.id}><div><strong>{formatDateTime(item.starts_at, timezone)}</strong><p>{item.customers?.name} · {item.customers?.phone}</p></div><div className="align-right"><span>{item.services?.name}</span><small>{item.professionals?.name} · {item.status}</small></div></article>)}</div>}
    </section>
  </>;
}

