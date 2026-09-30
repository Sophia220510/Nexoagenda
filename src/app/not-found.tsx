import Link from "next/link";
import { NexoBrand } from "@/components/nexo-brand";

export default function NotFound() {
  return <main className="state-page"><div className="state-card"><NexoBrand /><p className="state-code">404</p><h1>Essa página não existe.</h1><p>Talvez o link tenha mudado ou sido digitado incorretamente.</p><div className="state-actions"><Link className="button" href="/">Voltar ao início</Link><Link href="/login">Entrar no NEXO Book</Link></div></div></main>;
}
