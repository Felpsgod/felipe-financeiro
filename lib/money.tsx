"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { formatBRL } from "./format";

interface MoneyCtx {
  hidden: boolean;
  toggle: () => void;
}

const Ctx = createContext<MoneyCtx>({ hidden: true, toggle: () => {} });

export function MoneyProvider({ children }: { children: ReactNode }) {
  // Começa oculto ao abrir o app; lembra a preferência depois.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("hideMoney") : null;
    if (saved !== null) setHidden(saved === "1");
  }, []);

  function toggle() {
    setHidden((h) => {
      const next = !h;
      try { localStorage.setItem("hideMoney", next ? "1" : "0"); } catch {}
      return next;
    });
  }

  return <Ctx.Provider value={{ hidden, toggle }}>{children}</Ctx.Provider>;
}

export const useMoney = () => useContext(Ctx);

/** Exibe um valor monetário, mascarado quando o "olhinho" está ativado. */
export function Money({ value, className }: { value: number; className?: string }) {
  const { hidden } = useMoney();
  return <span className={className}>{hidden ? "R$ ••••" : formatBRL(value)}</span>;
}
