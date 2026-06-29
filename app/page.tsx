"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import QuickAdd from "@/components/QuickAdd";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/useCollection";
import { Money } from "@/lib/money";
import { formatDate, currentMonth } from "@/lib/format";
import type { Card, Financing, Transaction } from "@/lib/types";

const CAT_STYLE: Record<string, { c: string; e: string }> = {
  "Alimentação": { c: "#f59e0b", e: "🍽️" },
  "Transporte": { c: "#3b82f6", e: "🚗" },
  "Moradia": { c: "#8b5cf6", e: "🏠" },
  "Saúde": { c: "#ef4444", e: "❤️" },
  "Educação": { c: "#0ea5e9", e: "📚" },
  "Lazer": { c: "#ec4899", e: "🎮" },
  "Compras": { c: "#14b8a6", e: "🛍️" },
  "Assinaturas": { c: "#6366f1", e: "🔁" },
  "Financiamento": { c: "#64748b", e: "🏦" },
  "Fatura de cartão": { c: "#0891b2", e: "💳" },
  "Salário": { c: "#22c55e", e: "💼" },
  "Outros": { c: "#94a3b8", e: "💸" },
};
const cat = (c: string) => CAT_STYLE[c] ?? { c: "#94a3b8", e: "💸" };

export default function Dashboard() {
  const { user } = useAuth();
  const { items: financings } = useCollection<Financing>("financings");
  const { items: txns } = useCollection<Transaction>("transactions", true);
  useCollection<Card>("cards"); // mantém o cache aquecido

  const month = currentMonth();
  const firstName = (user?.displayName || "").split(" ")[0] || "por aqui";

  const s = useMemo(() => {
    const ofMonth = txns.filter((t) => t.date?.startsWith(month));
    let income = 0, expense = 0;
    const byCat: Record<string, number> = {};
    for (const t of ofMonth) {
      if (t.type === "income") income += t.amount;
      else {
        expense += t.amount;
        byCat[t.category] = (byCat[t.category] ?? 0) + t.amount;
      }
    }
    const cats = Object.entries(byCat)
      .map(([label, value]) => ({ label, value, color: cat(label).c }))
      .sort((a, b) => b.value - a.value);
    const installmentsDue = financings
      .filter((f) => f.paidInstallments < f.installments)
      .reduce((sum, f) => sum + f.installmentValue, 0);
    return { income, expense, balance: income - expense, cats, installmentsDue };
  }, [txns, financings, month]);

  const recent = txns.slice(0, 6);

  return (
    <AppShell>
      {/* Saudação */}
      <div className="mb-4 flex items-center gap-3">
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="Perfil" className="h-11 w-11 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
            {firstName.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="text-lg font-bold text-slate-800">Olá, {firstName}!</p>
          <p className="text-xs capitalize text-slate-400">{monthLabel(month)}</p>
        </div>
      </div>

      {/* Cartão de saldo */}
      <div className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-700/25">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute right-6 top-5 h-8 w-10 rounded-md bg-white/25" />
        <p className="text-sm text-blue-100">Saldo do mês</p>
        <p className="mt-1 text-4xl font-bold tracking-tight"><Money value={s.balance} /></p>
        <div className="mt-5 flex gap-6 text-sm">
          <div>
            <p className="text-blue-200">↑ Entradas</p>
            <p className="font-semibold"><Money value={s.income} /></p>
          </div>
          <div>
            <p className="text-blue-200">↓ Saídas</p>
            <p className="font-semibold"><Money value={s.expense} /></p>
          </div>
        </div>
      </div>

      {/* Adicionar por texto (IA) */}
      <QuickAdd />

      {/* Ações rápidas */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        <Action href="/lancamentos" label="Lançar" bg="bg-blue-50" fg="text-blue-600" icon={<PlusIcon />} />
        <Action href="/cartoes" label="Cartões" bg="bg-violet-50" fg="text-violet-600" icon={<CardIcon />} />
        <Action href="/financiamentos" label="Financ." bg="bg-amber-50" fg="text-amber-600" icon={<BankIcon />} />
        <Action href="/importar" label="Importar" bg="bg-emerald-50" fg="text-emerald-600" icon={<UpIcon />} />
      </div>

      {/* Gastos por categoria */}
      <h2 className="mb-2 font-semibold text-slate-800">Gastos por categoria</h2>
      <div className="card mb-6 flex items-center gap-5 p-4">
        {s.cats.length === 0 ? (
          <p className="py-4 text-sm text-slate-400">Sem gastos neste mês ainda.</p>
        ) : (
          <>
            <Donut data={s.cats} />
            <div className="flex-1 space-y-1.5">
              {s.cats.slice(0, 5).map((d) => (
                <div key={d.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.label}
                  </span>
                  <span className="font-medium text-slate-700"><Money value={d.value} /></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Últimos lançamentos */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Últimos lançamentos</h2>
        <Link href="/lancamentos" className="text-xs font-medium text-blue-600 hover:underline">ver todos</Link>
      </div>
      {recent.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          Nenhum lançamento ainda. Use o botão “+” ou registre pelo Telegram.
        </p>
      ) : (
        <div className="space-y-2">
          {recent.map((t) => {
            const st = cat(t.category);
            const income = t.type === "income";
            return (
              <div key={t.id} className="card flex items-center gap-3 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-full text-lg" style={{ backgroundColor: st.c + "22" }}>
                  {st.e}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{t.description}</p>
                  <p className="text-xs text-slate-400">{t.category} · {formatDate(t.date)}</p>
                </div>
                <span className={`shrink-0 font-semibold ${income ? "text-emerald-600" : "text-red-500"}`}>
                  {income ? "+" : "−"} <Money value={t.amount} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 42, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f7" strokeWidth="12" />
        {data.map((d) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle key={d.label} cx="50" cy="50" r={r} fill="none" stroke={d.color}
              strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-slate-700">{data.length}</span>
        <span className="text-[10px] text-slate-400">categorias</span>
      </div>
    </div>
  );
}

function Action({ href, label, bg, fg, icon }: { href: string; label: string; bg: string; fg: string; icon: ReactNodeT }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${bg} ${fg}`}>{icon}</span>
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </Link>
  );
}

type ReactNodeT = React.ReactNode;
function PlusIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>; }
function CardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>; }
function BankIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-6 9 6" /><path d="M4 10v9M20 10v9M9 10v9M15 10v9M2 21h20" /></svg>; }
function UpIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 8l5-5 5 5M5 21h14" /></svg>; }

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${meses[(m ?? 1) - 1]} de ${y}`;
}
