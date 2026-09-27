import Link from "next/link";

export function FinanceTabs({
  active,
}: {
  active: "overview" | "expenses" | "commissions";
}) {
  return (
    <nav className="finance-tabs" aria-label="Seções do financeiro">
      <Link
        className={active === "overview" ? "active" : ""}
        href="/painel/financeiro"
      >
        Visão geral
      </Link>
      <Link
        className={active === "expenses" ? "active" : ""}
        href="/painel/financeiro/despesas"
      >
        Despesas
      </Link>
      <Link
        className={active === "commissions" ? "active" : ""}
        href="/painel/financeiro/comissoes"
      >
        Comissões
      </Link>
    </nav>
  );
}
