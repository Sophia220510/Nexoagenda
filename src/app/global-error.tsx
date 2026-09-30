"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="pt-BR"><body style={{ fontFamily: "Arial, sans-serif", background: "#f7f8f4", color: "#17231b", margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><main style={{ maxWidth: 480, background: "white", borderRadius: 20, padding: 32 }}><strong>NEXO Book</strong><h1>Algo deu errado.</h1><p>Não foi possível abrir o aplicativo agora. Tente novamente em instantes.</p><button onClick={reset} style={{ background: "#abd448", border: 0, borderRadius: 10, padding: "12px 20px", cursor: "pointer" }}>Tentar novamente</button></main></body></html>;
}
