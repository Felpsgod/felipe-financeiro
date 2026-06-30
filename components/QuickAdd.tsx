"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

// URL do projeto do robô na Vercel (onde está a rota /api/quick).
// Se o domínio do robô mudar, ajuste aqui (ou defina NEXT_PUBLIC_BOT_URL).
const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || "https://felipe-financeiro-1amg.vercel.app";

export default function QuickAdd() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${BOT_URL}/api/quick`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ ok: true, text: data.message || "Registrado!" });
        setText("");
      } else {
        setMsg({ ok: false, text: data.error || "Não consegui registrar." });
      }
    } catch {
      setMsg({ ok: false, text: "Falha ao falar com o servidor. Tente de novo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-6 w-full">
      <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex: Gastei 100 no Itaú"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-slate-800 outline-none"
        />
        <button type="submit" disabled={busy || !text.trim()} className="btn-primary shrink-0 !rounded-xl !px-4 !py-2">
          {busy ? "…" : "Registrar"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 break-words px-1 text-sm ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
      )}
    </form>
  );
}
