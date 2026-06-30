"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/account";
import { useCollection } from "@/lib/useCollection";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { Money } from "@/lib/money";
import { formatDate, today } from "@/lib/format";
import type { Financing } from "@/lib/types";

const EMPTY = {
  description: "",
  totalAmount: 0,
  installments: 12,
  paidInstallments: 0,
  installmentValue: 0,
  dueDay: 10,
  startDate: today(),
};

export default function FinanciamentosPage() {
  const { user } = useAuth();
  const { activeUid } = useAccount();
  const { items: financings, loading } = useCollection<Financing>("financings");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  function openNew() {
    setForm(EMPTY);
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(f: Financing) {
    setForm({
      description: f.description,
      totalAmount: f.totalAmount,
      installments: f.installments,
      paidInstallments: f.paidInstallments,
      installmentValue: f.installmentValue,
      dueDay: f.dueDay,
      startDate: f.startDate,
    });
    setEditingId(f.id);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (editingId) await updateItem(activeUid, "financings", editingId, { ...form });
    else await addItem(activeUid, "financings", form);
    setOpen(false);
  }

  async function payInstallment(f: Financing) {
    if (!user || f.paidInstallments >= f.installments) return;
    await updateItem(activeUid, "financings", f.id, {
      paidInstallments: f.paidInstallments + 1,
    });
  }

  async function undoInstallment(f: Financing) {
    if (!user || f.paidInstallments <= 0) return;
    await updateItem(activeUid, "financings", f.id, {
      paidInstallments: f.paidInstallments - 1,
    });
  }

  async function remove(id: string) {
    if (!user) return;
    if (confirm("Excluir este financiamento?")) {
      await deleteItem(activeUid, "financings", id);
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financiamentos</h1>
        <button onClick={openNew} className="btn-primary">+ Novo</button>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : financings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nenhum financiamento cadastrado.
        </p>
      ) : (
        <div className="space-y-4">
          {financings.map((f) => {
            const pct = f.installments > 0 ? (f.paidInstallments / f.installments) * 100 : 0;
            const remaining = (f.installments - f.paidInstallments) * f.installmentValue;
            const done = f.paidInstallments >= f.installments;
            return (
              <div key={f.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{f.description}</h3>
                    <p className="text-xs text-slate-400">
                      <Money value={f.installmentValue} />/mês · vence dia {f.dueDay} · início {formatDate(f.startDate)}
                    </p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => openEdit(f)} className="text-slate-400 hover:text-emerald-600">Editar</button>
                    <button onClick={() => remove(f.id)} className="text-slate-400 hover:text-red-600">Excluir</button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {f.paidInstallments} de {f.installments} parcelas pagas
                  </span>
                  <span className="font-medium text-slate-700">
                    Falta <Money value={remaining} />
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => payInstallment(f)}
                    disabled={done}
                    className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {done ? "Quitado ✓" : "Registrar parcela paga"}
                  </button>
                  <button
                    onClick={() => undoInstallment(f)}
                    disabled={f.paidInstallments <= 0}
                    className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                  >
                    ↩︎ Desfazer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} title={editingId ? "Editar financiamento" : "Novo financiamento"} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Descrição (ex: Financiamento do carro)">
            <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total (R$)">
              <input type="number" min={0} step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Valor da parcela (R$)">
              <input type="number" min={0} step="0.01" value={form.installmentValue} onChange={(e) => setForm({ ...form, installmentValue: Number(e.target.value) })} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nº parcelas">
              <input type="number" min={1} value={form.installments} onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Já pagas">
              <input type="number" min={0} value={form.paidInstallments} onChange={(e) => setForm({ ...form, paidInstallments: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Vence dia">
              <input type="number" min={1} max={31} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })} className="input" />
            </Field>
          </div>
          <Field label="Data da 1ª parcela">
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input" />
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
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
