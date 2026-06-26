"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

type NavItem = { href: string; label: string; icon: ReactNode };

const NAV: NavItem[] = [
  { href: "/", label: "Resumo", icon: <IconHome /> },
  { href: "/cartoes", label: "Cartões", icon: <IconCard /> },
  { href: "/financiamentos", label: "Financ.", icon: <IconBank /> },
  { href: "/lancamentos", label: "Lançam.", icon: <IconList /> },
  { href: "/importar", label: "Importar", icon: <IconUpload /> },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <IconWallet />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-800">
              Meu Financeiro
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-4 hidden flex-1 gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive(item.href)
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button onClick={() => signOut()} className="ml-auto btn-ghost md:ml-0">
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  active ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                <span className={active ? "scale-110 transition" : "transition"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ----- ícones (SVG inline, sem dependências) ----- */
function IconWallet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M21 12a2 2 0 0 0-2-2h-3a2 2 0 0 0 0 4h3a2 2 0 0 0 2-2Z" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
    </svg>
  );
}
function IconBank() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-6 9 6" /><path d="M4 10v9" /><path d="M20 10v9" /><path d="M9 10v9" /><path d="M15 10v9" /><path d="M2 21h20" />
    </svg>
  );
}
function IconList() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" />
    </svg>
  );
}
