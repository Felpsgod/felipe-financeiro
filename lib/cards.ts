import { effectiveMonth } from "./format";
import type { Card, Transaction } from "./types";

/**
 * Valor "usado" do cartão.
 * - Crédito: tudo em aberto (faturas do mês atual em diante) — reflete o total comprometido.
 * - Alimentação: gasto do mês corrente (consome o saldo do benefício).
 */
export function cardUsed(card: Card, txns: Transaction[], currentMonth: string): number {
  const isMeal = card.kind === "alimentacao";
  let used = 0;
  for (const t of txns) {
    if (t.cardId !== card.id || t.type !== "expense") continue;
    const em = effectiveMonth(t);
    if (isMeal) {
      if (em === currentMonth) used += t.amount;
    } else if (em >= currentMonth) {
      used += t.amount;
    }
  }
  return used;
}
