"use client";

import Link from "next/link";
import { NexoBrand } from "@/components/nexo-brand";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="state-page"><div className="state-card"><NexoBrand /><p className="state-code">Ops</p><h1>Não foi possível carregar esta página.</h1><p>Tente novamente. Se o problema continuar, entre em contato com a equipe.</p><div className="state-actions"><button className="button" onClick={reset}>Tentar novamente</button><Link href="/">Voltar ao início</Link></div></div></main>;
}
