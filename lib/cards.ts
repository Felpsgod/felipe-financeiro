import { effectiveMonth } from "./format";
import { installmentOutstanding } from "./installments";
import type { Card, Transaction, Installment } from "./types";

/**
 * Valor "usado" do cartão.
 * - Crédito: tudo em aberto (faturas do mês atual em diante) + parcelas futuras — reflete o total comprometido.
 * - Alimentação: gasto do mês corrente (consome o saldo do benefício).
 */
export function cardUsed(
  card: Card,
  txns: Transaction[],
  currentMonth: string,
  installments: (Installment & { id: string })[] = [],
): number {
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
  if (!isMeal) {
    for (const p of installments) {
      if (p.cardId === card.id) used += installmentOutstanding(p, currentMonth);
    }
  }
  return used;
}

/**
 * Saldo disponível do cartão de alimentação/refeição.
 * Começa no saldo base (limit), soma os recebimentos ("recebi X no Caju") e
 * subtrai os gastos. Como é acumulado, o que sobra "rola" para o mês seguinte.
 */
export function cardBalance(card: Card, txns: Transaction[]): number {
  let bal = card.limit || 0;
  for (const t of txns) {
    if (t.cardId !== card.id) continue;
    if (t.type === "income") bal += t.amount;
    else bal -= t.amount;
  }
  return bal;
}
