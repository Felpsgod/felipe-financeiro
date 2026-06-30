"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/account";
import { useCollection } from "@/lib/useCollection";
import { addItem } from "@/lib/db";
import { formatBRL, formatDate } from "@/lib/format";
import { parseOFX, parseCSV, type ParsedTxn } from "@/lib/importers";
import type { Card } from "@/lib/types";

export default function ImportarPage() {
  const { user } = useAuth();
  const { activeUid } = useAccount();
  const { items: cards } = useCollection<Card>("cards");
  const [rows, setRows] = useState<(ParsedTxn & { include: boolean })[]>([]);
  const [cardId, setCardId] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(0);
    const content = await file.text();
    const isOFX = /\.ofx$|\.qfx$/i.test(file.name) || content.includes("<STMTTRN>");
    const parsed = isOFX ? parseOFX(content) : parseCSV(content);
    setRows(parsed.map((p) => ({ ...p, include: true })));
  }

  async function importAll() {
    if (!user) return;
    setBusy(true);
    let count = 0;
    for (const r of rows) {
      if (!r.include) continue;
      const isIncome = r.amount > 0;
      await addItem(activeUid, "transactions", {
        description: r.description,
        amount: Math.abs(r.amount),
        date: r.date,
        category: isIncome ? "Salário" : "Outros",
        type: isIncome ? "income" : "expense",
        paid: true,
        source: "import",
        ...(cardId && !isIncome ? { cardId } : {}),
      });
      count++;
    }
    setDone(count);
    setRows([]);
    setFileName("");
    setBusy(false);
  }

  const selected = rows.filter((r) => r.include).length;

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-bold">Importar extrato</h1>
      <p className="mb-5 text-sm text-slate-500">
        Baixe o extrato do seu banco em <strong>OFX</strong> (ou CSV) e importe aqui.
        O arquivo é processado no seu navegador — nada é enviado para fora.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="btn-primary cursor-pointer">
          Escolher arquivo (.ofx / .csv)
          <input type="file" accept=".ofx,.qfx,.csv,.txt" onChange={handleFile} className="hidden" />
        </label>
        {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
        {cards.length > 0 && rows.length > 0 && (
          <select value={cardId} onChange={(e) => setCardId(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Vincular a um cartão? (opcional)</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {done > 0 && (
        <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {done} lançamento(s) importado(s) com sucesso. Veja em <strong>Lançamentos</strong>.
        </p>
      )}

      {rows.length === 0 ? (
        done === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Nenhum arquivo carregado ainda.
          </p>
        )
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">{selected} de {rows.length} selecionados</span>
            <button onClick={importAll} disabled={busy || selected === 0} className="btn-primary">
              {busy ? "Importando…" : `Importar ${selected}`}
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, include: e.target.checked } : x))}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-500">{formatDate(r.date)}</td>
                    <td className="px-3 py-2">{r.description}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${r.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatBRL(Math.abs(r.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
