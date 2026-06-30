"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import BankLogo from "@/components/BankLogo";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/account";
import { useCollection } from "@/lib/useCollection";
import { deleteItem } from "@/lib/db";
import { cardUsed } from "@/lib/cards";
import { Money } from "@/lib/money";
import { effectiveMonth, currentMonth, monthLabel, addMonth } from "@/lib/format";
import type { Card, Transaction, Installment } from "@/lib/types";

const CAT_EMOJI: Record<string, string> = {
  "Alimentação": "🍽️", "Transporte": "🚗", "Moradia": "🏠", "Saúde": "❤️",
  "Educação": "📚", "Lazer": "🎮", "Compras": "🛍️", "Assinaturas": "🔁",
  "Financiamento": "🏦", "Fatura de cartão": "💳", "Salário": "💼", "Outros": "💸",
};

export default function CartaoExtrato() {
  const { user } = useAuth();
  const { activeUid } = useAccount();
  const { items: cards } = useCollection<Card>("cards");
  const { items: txns } = useCollection<Transaction>("transactions");
  const { items: installments } = useCollection<Installment>("installments");
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get("id"));
  }, []);

  const card = cards.find((c) => c.id === id);
  const cardInstallments = installments.filter((p) => p.cardId === id);

  const months = useMemo(() => {
    if (!id) return [];
    const map: Record<string, { total: number; cats: Record<string, number> }> = {};
    const add = (m: string, category: string, amount: number) => {
      map[m] = map[m] || { total: 0, cats: {} };
      map[m].total += amount;
      map[m].cats[category] = (map[m].cats[category] ?? 0) + amount;
    };
    for (const t of txns) {
      if (t.cardId !== id || t.type !== "expense") continue;
      add(effectiveMonth(t), t.category, t.amount);
    }
    // parcelas das compras parceladas
    for (const p of cardInstallments) {
      const parcel = p.totalAmount / p.count;
      for (let k = 0; k < p.count; k++) add(addMonth(p.firstMonth, k), p.category, parcel);
    }
    return Object.entries(map)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [txns, cardInstallments, id]);

  async function removeInstallment(pid: string) {
    if (!user) return;
    if (confirm("Excluir este parcelamento? Todas as parcelas somem.")) {
      await deleteItem(activeUid, "installments", pid);
    }
  }

  return (
    <AppShell>
      <Link href="/cartoes" className="mb-3 inline-block text-sm text-blue-600 hover:underline">‹ Cartões</Link>

      {!card ? (
        <p className="text-slate-400">Carregando cartão…</p>
      ) : (
        <>
          <div className="mb-5 overflow-hidden rounded-2xl p-4 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${card.color}, ${shade(card.color)})` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/70">{card.kind === "alimentacao" ? "Alimentação" : card.brand}</p>
                <p className="text-lg font-semibold">{card.name}</p>
              </div>
              <BankLogo name={card.name} size={44} />
            </div>
            <p className="mt-4 text-sm text-white/80">{card.kind === "alimentacao" ? "Usado este mês" : "Em aberto"}</p>
            <p className="text-2xl font-bold">
              <Money value={cardUsed(card, txns, currentMonth(), installments)} /> <span className="text-sm font-normal text-white/70">/ <Money value={card.limit} /></span>
            </p>
          </div>

          {cardInstallments.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-2 font-semibold text-slate-800">Parcelamentos</h2>
              <div className="space-y-2">
                {cardInstallments.map((p) => (
                  <div key={p.id} className="card flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{p.description}</p>
                      <p className="text-xs text-slate-400">{p.count}x de <Money value={p.totalAmount / p.count} /> · total <Money value={p.totalAmount} /></p>
                    </div>
                    <button onClick={() => removeInstallment(p.id)} className="shrink-0 text-xs text-slate-400 hover:text-red-600">Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="mb-2 font-semibold text-slate-800">Extrato por mês</h2>
          {months.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
              Nenhum gasto neste cartão ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {months.map((m) => (
                <div key={m.month} className="card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold capitalize text-slate-700">{monthLabel(m.month)}</span>
                    <span className="font-bold text-slate-800"><Money value={m.total} /></span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(m.cats).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{CAT_EMOJI[cat] ?? "💸"} {cat}</span>
                        <span className="text-slate-500"><Money value={val} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function shade(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `rgb(${r}, ${g}, ${b})`;
}
