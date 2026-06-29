"use client";

import { useState } from "react";
import { detectBank, bankLogoUrl } from "@/lib/banks";

/** Mostra o logo do banco detectado pelo nome; se não achar/carregar,
 *  cai num quadradinho colorido com a inicial. */
export default function BankLogo({ name, size = 40 }: { name: string; size?: number }) {
  const bank = detectBank(name);
  const [err, setErr] = useState(false);

  if (bank && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bankLogoUrl(bank.domain)}
        alt={bank.name}
        onError={() => setErr(true)}
        referrerPolicy="no-referrer"
        className="rounded-lg bg-white object-contain p-1 shadow-sm"
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="grid place-items-center rounded-lg font-bold text-white shadow-sm"
      style={{ width: size, height: size, backgroundColor: bank?.color ?? "rgba(255,255,255,.25)" }}
    >
      {initial}
    </span>
  );
}
