"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/account";
import { watchDoc, setDocData, setInvite, deleteInvite, watchMyInvites, watchMembers, removeMember } from "@/lib/db";

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
  const { activeUid } = useAccount();
  const [provider, setProvider] = useState<Provider>("local");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Compartilhamento (sempre da MINHA conta).
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<{ id: string }[]>([]);
  const [members, setMembers] = useState<{ id: string; email?: string }[]>([]);

  useEffect(() => {
    if (!activeUid) return;
    const unsub = watchDoc<{ provider?: Provider }>(activeUid, "settings", "ai", (d) => {
      if (d?.provider) setProvider(d.provider);
    });
    return () => unsub();
  }, [activeUid]);

  useEffect(() => {
    if (!user) return;
    const u1 = watchMyInvites(user.uid, setInvites);
    const u2 = watchMembers(user.uid, setMembers);
    return () => { u1(); u2(); };
  }, [user]);

  async function save(p: Provider) {
    if (!activeUid) return;
    setProvider(p);
    setBusy(true);
    try {
      await setDocData(activeUid, "settings", "ai", { provider: p });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !email.trim()) return;
    try {
      await setInvite(user.uid, user.email ?? "", user.displayName ?? "", email.trim());
      setEmail("");
    } catch {
      alert("Não foi possível convidar.");
    }
  }

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-800">Configurações</h1>
      <p className="mb-5 text-sm text-slate-400">Inteligência do chat e compartilhamento das finanças.</p>

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
                active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div>
                <p className="font-medium text-slate-800">{o.label}</p>
                <p className="text-xs text-slate-400">{o.hint}</p>
              </div>
              <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300"}`}>
                {active && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {saved && <p className="mt-3 text-sm font-medium text-blue-600">Salvo! ✓</p>}

      {/* Compartilhamento */}
      <h2 className="mb-2 mt-8 font-semibold text-slate-700">Compartilhar minhas finanças</h2>
      <p className="mb-3 text-xs text-slate-400">
        Convide alguém (ex: sua esposa) pelo e-mail do Google. A pessoa entra com a conta dela e poderá
        <strong> ver, editar e registrar</strong> suas finanças. Ela troca de conta pelo seletor no topo.
      </p>
      <form onSubmit={invite} className="mb-3 flex gap-2">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" className="input" />
        <button type="submit" className="btn-primary shrink-0">Convidar</button>
      </form>

      {(members.length > 0 || invites.length > 0) && (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="card flex items-center justify-between p-3 text-sm">
              <span className="truncate text-slate-700">{m.email ?? m.id} <span className="text-emerald-600">· com acesso</span></span>
              <button onClick={() => user && removeMember(user.uid, m.id)} className="shrink-0 text-xs text-slate-400 hover:text-red-600">Remover</button>
            </div>
          ))}
          {invites.map((i) => (
            <div key={i.id} className="card flex items-center justify-between p-3 text-sm">
              <span className="truncate text-slate-700">{i.id} <span className="text-amber-600">· convite pendente</span></span>
              <button onClick={() => deleteInvite(i.id)} className="shrink-0 text-xs text-slate-400 hover:text-red-600">Cancelar</button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
        Provedores de IA exigem a chave correspondente nas variáveis do robô (na Vercel). O modo
        <strong> Grátis</strong> funciona sem configurar nada.
      </p>
    </AppShell>
  );
}
