"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/account";
import { useCollection } from "@/lib/useCollection";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { Money } from "@/lib/money";
import { currentMonth } from "@/lib/format";
import { CATEGORIES, type Recurring } from "@/lib/types";

function emptyForm() {
  return {
    description: "",
    amount: 0,
    type: "expense" as "expense" | "income",
    category: "Assinaturas",
    dayOfMonth: 5,
    startMonth: currentMonth(),
    active: true,
  };
}

export default function FixasPage() {
  const { user } = useAuth();
  const { activeUid } = useAccount();
  const { items, loading } = useCollection<Recurring>("recurring");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  function openNew() { setForm(emptyForm()); setEditingId(null); setOpen(true); }
  function openEdit(r: Recurring) {
    setForm({
      description: r.description, amount: r.amount, type: r.type, category: r.category,
      dayOfMonth: r.dayOfMonth, startMonth: r.startMonth ?? currentMonth(), active: r.active !== false,
    });
    setEditingId(r.id); setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      if (editingId) await updateItem(activeUid, "recurring", editingId, { ...form });
      else await addItem(activeUid, "recurring", form);
      setOpen(false);
    } catch {
      alert("Não foi possível salvar.");
    }
  }

  async function remove(id: string) {
    if (!user) return;
    if (confirm("Excluir esta conta fixa? Ela deixa de aparecer nos próximos meses.")) {
      await deleteItem(activeUid, "recurring", id);
    }
  }

  return (
    <AppShell>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Contas fixas</h1>
        <button onClick={openNew} className="btn-primary">+ Nova</button>
      </div>
      <p className="mb-5 text-sm text-slate-400">
        Cadastre uma vez e elas aparecem automaticamente em todos os meses (ex: Netflix, aluguel, luz).
      </p>

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          Nenhuma conta fixa ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{r.description}</p>
                <p className="text-xs text-slate-400">
                  {r.type === "income" ? "Receita" : "Despesa"} · {r.category} · todo dia {r.dayOfMonth}
                </p>
              </div>
              <span className={`font-semibold ${r.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                {r.type === "income" ? "+" : "−"} <Money value={r.amount} />
              </span>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-blue-600">Editar</button>
                <button onClick={() => remove(r.id)} className="text-slate-400 hover:text-red-600">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} title={editingId ? "Editar conta fixa" : "Nova conta fixa"} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Descrição (ex: Netflix)">
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input type="number" min={0} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Dia do mês">
              <input type="number" min={1} max={31} value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "expense" | "income" })} className="input">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
              </select>
            </Field>
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Começa em (mês)">
            <input type="month" value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })} className="input" />
          </Field>
          <button type="submit" className="btn-primary w-full">Salvar</button>
        </form>
      </Modal>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
