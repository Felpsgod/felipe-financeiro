import type { Recurring, Transaction } from "./types";

// Um "lançamento" que aparece nas listas. As contas fixas viram entradas
// virtuais (recurring: true) — não ficam salvas mês a mês; são geradas na hora.
export type Entry = Transaction & { recurring?: boolean };

/** Gera as contas fixas válidas para um mês (YYYY-MM) como lançamentos virtuais. */
export function recurringForMonth(recs: (Recurring & { id: string })[], month: string): Entry[] {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return recs
    .filter((r) => r.active !== false && (!r.startMonth || r.startMonth <= month))
    .map((r) => {
      const day = Math.min(Math.max(1, r.dayOfMonth || 1), lastDay);
      return {
        id: `rec:${r.id}:${month}`,
        description: r.description,
        amount: r.amount,
        type: r.type,
        category: r.category,
        date: `${month}-${String(day).padStart(2, "0")}`,
        paid: false,
        createdAt: 0,
        recurring: true,
      };
    });
}
