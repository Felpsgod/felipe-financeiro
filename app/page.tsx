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

  const s = useMemo(() => {
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
      .reduce((sum, f) => sum + f.installmentValue, 0);
    return { income, expense, byCard, installmentsDue, balance: income - expense };
  }, [txns, financings, month]);

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Olá! 👋</h1>
        <p className="text-sm capitalize text-slate-400">{monthLabel(month)}</p>
      </div>

      {/* Hero: saldo do mês */}
      <div className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-600/20">
        <p className="text-sm text-emerald-50/90">Saldo do mês</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{formatBRL(s.balance)}</p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="text-emerald-50/80">Entradas</p>
            <p className="font-semibold">{formatBRL(s.income)}</p>
          </div>
          <div>
            <p className="text-emerald-50/80">Saídas</p>
            <p className="font-semibold">{formatBRL(s.expense)}</p>
          </div>
        </div>
      </div>

      {/* Cards de atalho */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <MiniStat label="Parcelas a pagar" value={formatBRL(s.installmentsDue)} tone="amber" />
        <MiniStat label="Cartões ativos" value={String(cards.length)} tone="slate" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <SectionHead title="Gasto por cartão" href="/cartoes" />
          {cards.length === 0 ? (
            <Empty>Cadastre um cartão para acompanhar a fatura.</Empty>
          ) : (
            <div className="space-y-2.5">
              {cards.map((c) => {
                const spent = s.byCard[c.id] ?? 0;
                const pct = c.limit > 0 ? Math.min(100, (spent / c.limit) * 100) : 0;
                return (
                  <div key={c.id} className="card p-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="text-slate-500">{formatBRL(spent)} <span className="text-slate-300">/ {formatBRL(c.limit)}</span></span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionHead title="Financiamentos em aberto" href="/financiamentos" />
          {financings.filter((f) => f.paidInstallments < f.installments).length === 0 ? (
            <Empty>Nenhuma parcela em aberto.</Empty>
          ) : (
            <div className="space-y-2.5">
              {financings.filter((f) => f.paidInstallments < f.installments).map((f) => (
                <div key={f.id} className="card p-3.5 text-sm">
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>{f.description}</span>
                    <span>{formatBRL(f.installmentValue)}/mês</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
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

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "amber" | "slate" }) {
  const tones = {
    amber: "from-amber-50 to-orange-50 text-amber-700",
    slate: "from-slate-50 to-slate-100 text-slate-700",
  };
  return (
    <div className={`rounded-2xl border border-slate-100 bg-gradient-to-br ${tones[tone]} p-4`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h2 className="font-semibold text-slate-800">{title}</h2>
      <Link href={href} className="text-xs font-medium text-emerald-600 hover:underline">ver tudo</Link>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">{children}</p>;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${meses[(m ?? 1) - 1]} de ${y}`;
}
