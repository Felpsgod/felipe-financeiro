"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import BankLogo from "@/components/BankLogo";
import { detectBank } from "@/lib/banks";
import { cardUsed } from "@/lib/cards";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/useCollection";
import { addItem, updateItem, deleteItem } from "@/lib/db";
import { Money } from "@/lib/money";
import { currentMonth } from "@/lib/format";
import type { Card, CardBrand, CardKind, Transaction, Installment } from "@/lib/types";

const BRANDS: { value: CardBrand; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "Amex" },
  { value: "hipercard", label: "Hipercard" },
  { value: "outro", label: "Outro" },
];

const EMPTY = {
  name: "", brand: "mastercard" as CardBrand, kind: "credito" as CardKind,
  limit: 0, closingDay: 1, dueDay: 10, receivingDay: 5, color: "#2563eb",
};

export default function CartoesPage() {
  const { user } = useAuth();
  const { items: cards, loading } = useCollection<Card>("cards");
  const { items: txns } = useCollection<Transaction>("transactions");
  const { items: installments } = useCollection<Installment>("installments");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const month = currentMonth();

  function openNew() { setForm(EMPTY); setEditingId(null); setOpen(true); }
  function openEdit(c: Card) {
    setForm({
      name: c.name, brand: c.brand, kind: c.kind ?? "credito", limit: c.limit,
      closingDay: c.closingDay ?? 1, dueDay: c.dueDay ?? 10, receivingDay: c.receivingDay ?? 5, color: c.color,
    });
    setEditingId(c.id); setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      if (editingId) await updateItem(user.uid, "cards", editingId, { ...form });
      else await addItem(user.uid, "cards", form);
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar. Verifique sua conexão e se as Regras do Firestore foram publicadas.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!user) return;
    if (!confirm("Excluir este cartão? Os lançamentos ligados a ele não serão apagados.")) return;
    try {
      await deleteItem(user.uid, "cards", id);
    } catch {
      alert("Não foi possível excluir.");
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Cartões</h1>
        <button onClick={openNew} className="btn-primary">+ Novo</button>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : cards.length === 0 ? (
        <Empty>Nenhum cartão cadastrado. Adicione o primeiro para acompanhar a fatura.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => {
            const isMeal = c.kind === "alimentacao";
            const used = cardUsed(c, txns, month, installments);
            const pct = c.limit > 0 ? Math.min(100, (used / c.limit) * 100) : 0;
            const balance = c.limit - used;
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl shadow-md">
                {/* "cartão" colorido (clique abre o extrato) */}
                <Link href={`/cartao?id=${c.id}`} className="block">
                  <div className="relative p-4 text-white" style={{ background: `linear-gradient(135deg, ${c.color}, ${shade(c.color)})` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-white/70">{isMeal ? "Alimentação" : c.brand}</p>
                        <p className="mt-0.5 text-lg font-semibold">{c.name}</p>
                      </div>
                      <BankLogo name={c.name} size={40} />
                    </div>
                    <p className="mt-6 text-sm text-white/80">{isMeal ? "Saldo disponível" : "Fatura em aberto"}</p>
                    <p className="text-2xl font-bold"><Money value={isMeal ? balance : used} /></p>
                  </div>
                </Link>
                {/* rodapé branco */}
                <div className="bg-white p-4">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{isMeal ? "Usado" : "Limite usado"} <Money value={used} /> / <Money value={c.limit} /></span>
                    <span>{isMeal ? `Recebe dia ${c.receivingDay}` : `Fecha ${c.closingDay} · Vence ${c.dueDay}`}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="btn-ghost">Editar</button>
                    <button onClick={() => remove(c.id)} className="btn-ghost hover:text-red-600">Excluir</button>
                  </div>
                </div>
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
              onChange={(e) => {
                const name = e.target.value;
                const bank = detectBank(name);
                setForm((f) => ({ ...f, name, ...(bank ? { color: bank.color } : {}) }));
              }}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CardKind })} className="input">
                <option value="credito">Crédito</option>
                <option value="alimentacao">Alimentação / Refeição</option>
              </select>
            </Field>
            <Field label={form.kind === "alimentacao" ? "Saldo mensal (R$)" : "Limite (R$)"}>
              <input type="number" min={0} step="0.01" value={form.limit} onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })} className="input" />
            </Field>
          </div>

          {form.kind === "alimentacao" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Recebe dia">
                <input type="number" min={1} max={31} value={form.receivingDay} onChange={(e) => setForm({ ...form, receivingDay: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="Cor">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-[42px] w-full rounded-xl border border-slate-200" />
              </Field>
            </div>
          ) : (
            <>
              <Field label="Bandeira">
                <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value as CardBrand })} className="input">
                  {BRANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Fecha dia">
                  <input type="number" min={1} max={31} value={form.closingDay} onChange={(e) => setForm({ ...form, closingDay: Number(e.target.value) })} className="input" />
                </Field>
                <Field label="Vence dia">
                  <input type="number" min={1} max={31} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })} className="input" />
                </Field>
                <Field label="Cor">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-[42px] w-full rounded-xl border border-slate-200" />
                </Field>
              </div>
            </>
          )}
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Salvando…" : "Salvar"}</button>
        </form>
      </Modal>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="field-label">{label}</span>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">{children}</p>;
}

/** Escurece um hex para o gradiente do cartão. */
function shade(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `rgb(${r}, ${g}, ${b})`;
}
