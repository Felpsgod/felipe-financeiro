"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { watchDoc, setDocData } from "@/lib/db";

type Provider = "local" | "deepseek" | "openai" | "gemini" | "claude";

const OPTIONS: { value: Provider; label: string; hint: string }[] = [
  { value: "local", label: "Grátis (sem IA)", hint: "Interpretador embutido — sem chave, sem custo. Recomendado." },
  { value: "deepseek", label: "DeepSeek", hint: "Barato, mas precisa de crédito" },
  { value: "openai", label: "GPT (OpenAI)", hint: "Precisa de crédito" },
  { value: "gemini", label: "Gemini (Google)", hint: "Cota gratuita limitada" },
  { value: "claude", label: "Claude (Anthropic)", hint: "Precisa de crédito" },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider>("local");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = watchDoc<{ provider?: Provider }>(user.uid, "settings", "ai", (d) => {
      if (d?.provider) setProvider(d.provider);
    });
    return () => unsub();
  }, [user]);

  async function save(p: Provider) {
    if (!user) return;
    setProvider(p);
    setBusy(true);
    try {
      await setDocData(user.uid, "settings", "ai", { provider: p });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-800">Configurações</h1>
      <p className="mb-5 text-sm text-slate-400">Escolha a inteligência que interpreta suas mensagens no Telegram.</p>

      <h2 className="mb-2 font-semibold text-slate-700">Modelo de IA</h2>
      <div className="space-y-2.5">
        {OPTIONS.map((o) => {
          const active = provider === o.value;
          return (
            <button
              key={o.value}
              onClick={() => save(o.value)}
              disabled={busy}
              className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                active ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div>
                <p className="font-medium text-slate-800">{o.label}</p>
                <p className="text-xs text-slate-400">{o.hint}</p>
              </div>
              <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                {active && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {saved && <p className="mt-3 text-sm font-medium text-emerald-600">Salvo! ✓</p>}

      <p className="mt-5 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
        <strong>Grátis (sem IA)</strong> funciona na hora, sem configurar nada. Os provedores de IA
        (DeepSeek, GPT, Gemini, Claude) entendem frases mais complexas, mas exigem a respectiva
        chave de API nas variáveis do robô (na Vercel) e, em geral, crédito.
      </p>
    </AppShell>
  );
}
