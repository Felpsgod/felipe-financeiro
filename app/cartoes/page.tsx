"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/useCollection";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { formatBRL, currentMonth } from "@/lib/format";
import type { Card, CardBrand, Transaction } from "@/lib/types";

const BRANDS: { value: CardBrand; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "Amex" },
  { value: "hipercard", label: "Hipercard" },
  { value: "outro", label: "Outro" },
];

const EMPTY = {
  name: "",
  brand: "mastercard" as CardBrand,
  limit: 0,
  closingDay: 1,
  dueDay: 10,
  color: "#10b981",
};

export default function CartoesPage() {
  const { user } = useAuth();
  const { items: cards, loading } = useCollection<Card>("cards");
  const { items: txns } = useCollection<Transaction>("transactions");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  // Quanto já foi gasto no cartão no mês corrente.
  const spendByCard = useMemo(() => {
    const month = currentMonth();
    const map: Record<string, number> = {};
    for (const t of txns) {
      if (t.type === "expense" && t.cardId && t.date?.startsWith(month)) {
        map[t.cardId] = (map[t.cardId] ?? 0) + t.amount;
      }
    }
    return map;
  }, [txns]);

  function openNew() {
    setForm(EMPTY);
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(c: Card) {
    setForm({
      name: c.name,
      brand: c.brand,
      limit: c.limit,
      closingDay: c.closingDay,
      dueDay: c.dueDay,
      color: c.color,
    });
    setEditingId(c.id);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (editingId) await updateItem(user.uid, "cards", editingId, { ...form });
    else await addItem(user.uid, "cards", form);
    setOpen(false);
  }

  async function remove(id: string) {
    if (!user) return;
    if (confirm("Excluir este cartão? Os lançamentos ligados a ele não serão apagados.")) {
      await deleteItem(user.uid, "cards", id);
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cartões</h1>
        <button
          onClick={openNew}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          + Novo cartão
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nenhum cartão cadastrado. Adicione o primeiro para acompanhar a fatura.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => {
            const spent = spendByCard[c.id] ?? 0;
            const pct = c.limit > 0 ? Math.min(100, (spent / c.limit) * 100) : 0;
            return (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                style={{ borderTopColor: c.color, borderTopWidth: 4 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-xs uppercase text-slate-400">{c.brand}</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-emerald-600">
                      Editar
                    </button>
                    <button onClick={() => remove(c.id)} className="text-slate-400 hover:text-red-600">
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  Fatura do mês: <strong>{formatBRL(spent)}</strong> de {formatBRL(c.limit)}
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Fecha dia {c.closingDay} · vence dia {c.dueDay}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} title={editingId ? "Editar cartão" : "Novo cartão"} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Nome (ex: Nubank)">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bandeira">
              <select
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value as CardBrand })}
                className="input"
              >
                {BRANDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Limite (R$)">
              <input
                type="number" min={0} step="0.01"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Fecha dia">
              <input
                type="number" min={1} max={31}
                value={form.closingDay}
                onChange={(e) => setForm({ ...form, closingDay: Number(e.target.value) })}
                className="input"
              />
            </Field>
            <Field label="Vence dia">
              <input
                type="number" min={1} max={31}
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}
                className="input"
              />
            </Field>
            <Field label="Cor">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 w-full rounded-md border border-slate-300"
              />
            </Field>
          </div>
          <button type="submit" className="w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Salvar
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
