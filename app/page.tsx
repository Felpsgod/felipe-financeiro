"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useCollection } from "@/lib/useCollection";
import { formatBRL, currentMonth } from "@/lib/format";
import type { Card, Financing, Transaction } from "@/lib/types";

export default function Dashboard() {
  const { items: cards } = useCollection<Card>("cards");
  const { items: financings } = useCollection<Financing>("financings");
  const { items: txns } = useCollection<Transaction>("transactions");

  const month = currentMonth();

  const summary = useMemo(() => {
    const ofMonth = txns.filter((t) => t.date?.startsWith(month));
    let income = 0, expense = 0;
    const byCard: Record<string, number> = {};
    for (const t of ofMonth) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
      if (t.type === "expense" && t.cardId) byCard[t.cardId] = (byCard[t.cardId] ?? 0) + t.amount;
    }
    const installmentsDue = financings
      .filter((f) => f.paidInstallments < f.installments)
      .reduce((s, f) => s + f.installmentValue, 0);
    return { income, expense, byCard, installmentsDue, balance: income - expense };
  }, [txns, financings, month]);

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-bold">Resumo do mês</h1>
      <p className="mb-5 text-sm text-slate-400">{monthLabel(month)}</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Entradas" value={formatBRL(summary.income)} tone="text-emerald-600" />
        <Stat label="Saídas" value={formatBRL(summary.expense)} tone="text-red-600" />
        <Stat label="Parcelas a pagar" value={formatBRL(summary.installmentsDue)} tone="text-amber-600" />
        <Stat label="Saldo" value={formatBRL(summary.balance)} tone={summary.balance >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Gasto por cartão</h2>
            <Link href="/cartoes" className="text-xs text-emerald-600 hover:underline">ver cartões</Link>
          </div>
          {cards.length === 0 ? (
            <Empty>Cadastre um cartão para ver os gastos aqui.</Empty>
          ) : (
            <div className="space-y-2">
              {cards.map((c) => {
                const spent = summary.byCard[c.id] ?? 0;
                const pct = c.limit > 0 ? Math.min(100, (spent / c.limit) * 100) : 0;
                return (
                  <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span>{formatBRL(spent)} <span className="text-slate-400">/ {formatBRL(c.limit)}</span></span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Financiamentos em aberto</h2>
            <Link href="/financiamentos" className="text-xs text-emerald-600 hover:underline">ver todos</Link>
          </div>
          {financings.filter((f) => f.paidInstallments < f.installments).length === 0 ? (
            <Empty>Nenhuma parcela em aberto.</Empty>
          ) : (
            <div className="space-y-2">
              {financings.filter((f) => f.paidInstallments < f.installments).map((f) => (
                <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{f.description}</span>
                    <span>{formatBRL(f.installmentValue)}/mês</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {f.paidInstallments}/{f.installments} parcelas · vence dia {f.dueDay}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">{children}</p>;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${meses[(m ?? 1) - 1]} de ${y}`;
}
