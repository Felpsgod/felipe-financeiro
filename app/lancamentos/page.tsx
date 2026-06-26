"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/useCollection";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { formatBRL, formatDate, today, currentMonth } from "@/lib/format";
import { CATEGORIES, type Card, type Transaction, type TransactionType } from "@/lib/types";

const TYPE_LABEL: Record<TransactionType, string> = {
  expense: "Despesa",
  income: "Receita",
  payment: "Pagamento",
};

function emptyForm() {
  return {
    description: "",
    amount: 0,
    date: today(),
    category: "Outros",
    type: "expense" as TransactionType,
    cardId: "",
    paid: false,
  };
}

export default function LancamentosPage() {
  const { user } = useAuth();
  const { items: txns, loading } = useCollection<Transaction>("transactions", true);
  const { items: cards } = useCollection<Card>("cards");
  const [month, setMonth] = useState(currentMonth());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const cardName = (id?: string) => cards.find((c) => c.id === id)?.name;

  const filtered = useMemo(
    () => txns.filter((t) => t.date?.startsWith(month)),
    [txns, month],
  );

  const totals = useMemo(() => {
    let expense = 0, income = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount; // despesa e pagamento contam como saída
    }
    return { expense, income, balance: income - expense };
  }, [filtered]);

  function openNew() {
    setForm(emptyForm());
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(t: Transaction) {
    setForm({
      description: t.description,
      amount: t.amount,
      date: t.date,
      category: t.category,
      type: t.type,
      cardId: t.cardId ?? "",
      paid: t.paid,
    });
    setEditingId(t.id);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const data = {
      description: form.description,
      amount: form.amount,
      date: form.date,
      category: form.category,
      type: form.type,
      paid: form.paid,
      ...(form.cardId ? { cardId: form.cardId } : {}),
    };
    if (editingId) await updateItem(user.uid, "transactions", editingId, data);
    else await addItem(user.uid, "transactions", data);
    setOpen(false);
  }

  async function remove(id: string) {
    if (!user) return;
    if (confirm("Excluir este lançamento?")) await deleteItem(user.uid, "transactions", id);
  }

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button onClick={openNew} className="btn-primary">+ Novo</button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Entradas" value={formatBRL(totals.income)} tone="text-emerald-600" />
        <Stat label="Saídas" value={formatBRL(totals.expense)} tone="text-red-600" />
        <Stat label="Saldo" value={formatBRL(totals.balance)} tone={totals.balance >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nenhum lançamento neste mês.
        </p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{t.description}</div>
                    <div className="text-xs text-slate-400">
                      {TYPE_LABEL[t.type]}
                      {t.cardId && ` · ${cardName(t.cardId) ?? "cartão"}`}
                      {!t.paid && " · em aberto"}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{t.category}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "−"} {formatBRL(t.amount)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => openEdit(t)} className="mr-2 text-slate-400 hover:text-emerald-600">Editar</button>
                    <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={editingId ? "Editar lançamento" : "Novo lançamento"} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Descrição">
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input type="number" min={0} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Data">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })} className="input">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="payment">Pagamento</option>
              </select>
            </Field>
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Cartão (opcional)">
            <select value={form.cardId} onChange={(e) => setForm({ ...form, cardId: e.target.value })} className="input">
              <option value="">— Nenhum —</option>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
            Já pago / quitado
          </label>
          <button type="submit" className="btn-primary w-full">Salvar</button>
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

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}
