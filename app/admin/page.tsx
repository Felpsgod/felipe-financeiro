"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { watchProfiles } from "@/lib/db";
import { ADMIN_EMAIL } from "@/lib/config";

type Profile = { id: string; email?: string; name?: string; photoURL?: string; lastLogin?: number };

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = watchProfiles(setProfiles);
    return () => unsub();
  }, [isAdmin]);

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-800">Usuários</h1>
      <p className="mb-5 text-sm text-slate-400">Quem acessou o aplicativo.</p>

      {!isAdmin ? (
        <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          Acesso restrito ao administrador.
        </p>
      ) : (
        <div className="space-y-2">
          {[...profiles].sort((a, b) => (b.lastLogin ?? 0) - (a.lastLogin ?? 0)).map((p) => (
            <div key={p.id} className="card flex items-center gap-3 p-3">
              {p.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoURL} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 font-bold text-slate-500">
                  {(p.name || p.email || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{p.name || "—"}</p>
                <p className="truncate text-xs text-slate-400">{p.email}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{fmt(p.lastLogin)}</span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function fmt(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
