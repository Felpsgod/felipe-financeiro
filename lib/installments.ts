import { addMonth } from "./format";
import type { Installment } from "./types";
import type { Entry } from "./recurring";

/** Gera as parcelas que caem no mês (YYYY-MM) como lançamentos virtuais. */
export function installmentsForMonth(purchases: (Installment & { id: string })[], month: string): Entry[] {
  const [y, mm] = month.split("-").map(Number);
  const lastDay = new Date(y, mm, 0).getDate();
  const out: Entry[] = [];
  for (const p of purchases) {
    for (let k = 0; k < p.count; k++) {
      if (addMonth(p.firstMonth, k) !== month) continue;
      const day = Math.min(Math.max(1, p.day || 1), lastDay);
      out.push({
        id: `inst:${p.id}:${k}`,
        description: `${p.description} (${k + 1}/${p.count})`,
        amount: p.totalAmount / p.count,
        type: "expense",
        category: p.category,
        date: `${month}-${String(day).padStart(2, "0")}`,
        cardId: p.cardId,
        cardKind: p.cardKind,
        paid: false,
        createdAt: 0,
        installment: true,
      });
    }
  }
  return out;
}

/** Total ainda em aberto (parcelas do mês atual em diante) de uma compra parcelada. */
export function installmentOutstanding(p: Installment, currentMonth: string): number {
  const parcel = p.totalAmount / p.count;
  let n = 0;
  for (let k = 0; k < p.count; k++) {
    if (addMonth(p.firstMonth, k) >= currentMonth) n++;
  }
  return n * parcel;
}
