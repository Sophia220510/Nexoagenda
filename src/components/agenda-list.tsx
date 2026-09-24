import Link from "next/link";
import { formatDateTime } from "@/lib/format";

interface AppointmentRow {
  id: string; starts_at: string; ends_at: string; status: string;
  customers: { name: string; phone: string } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
}

export function AgendaList({ rows, timezone, date, basePath }: { rows: AppointmentRow[]; timezone: string; date: string; basePath: string }) {
  const current = new Date(`${date}T12:00:00Z`); const previous = new Date(current); const next = new Date(current);
  previous.setUTCDate(previous.getUTCDate() - 1); next.setUTCDate(next.getUTCDate() + 1);
  const iso = (value: Date) => value.toISOString().slice(0, 10);
  const href = (value: string) => basePath.includes("date=") ? `${basePath}${value}` : `${basePath}?date=${value}`;
  const todayHref = basePath.includes("date=") ? `${basePath}${new Date().toISOString().slice(0, 10)}` : basePath;
  return <><div className="date-nav"><Link href={href(iso(previous))}>← Anterior</Link><Link href={todayHref}>Hoje</Link><Link href={href(iso(next))}>Próxima →</Link></div><section className="panel-card">{!rows.length ? <p className="empty">Nenhum horário encontrado nesta data.</p> : <div className="list">{rows.map((item) => <article className="list-row" key={item.id}><div><strong>{formatDateTime(item.starts_at, timezone)}</strong><p>{item.customers?.name} · {item.customers?.phone}</p></div><div className="align-right"><span>{item.services?.name}</span><small>{item.professionals?.name} · {Math.round((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60000)} min · {item.status}</small></div></article>)}</div>}</section></>;
}
