export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Retorna o mês corrente no formato YYYY-MM. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Data de hoje em YYYY-MM-DD (para inputs do tipo date). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Soma `delta` meses a um YYYY-MM. */
export function addMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Mês em que o lançamento "conta". Para gastos no cartão de crédito, cai na
 * fatura do mês seguinte (ex: compra em junho aparece em julho).
 */
export function effectiveMonth(t: { date: string; cardId?: string; cardKind?: string }): string {
  const ym = (t.date || "").slice(0, 7);
  // Cartão de crédito: cai na fatura do mês seguinte.
  // Dinheiro/pix e cartão de alimentação: ficam no mês da compra.
  const isCredit = t.cardId && t.cardKind !== "alimentacao";
  return isCredit ? addMonth(ym, 1) : ym;
}

/** Rótulo "junho de 2026" a partir de YYYY-MM. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${meses[(m ?? 1) - 1]} de ${y}`;
}
