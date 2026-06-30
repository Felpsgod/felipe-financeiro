"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, getDoc, setDoc, onSnapshot, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";

export interface Account {
  uid: string;
  label: string;
  isOwn: boolean;
}

interface AccountCtx {
  activeUid: string;
  setActiveUid: (uid: string) => void;
  accounts: Account[];
}

const Ctx = createContext<AccountCtx>({ activeUid: "", setActiveUid: () => {}, accounts: [] });

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeUid, setActiveUid] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (!user) {
      setActiveUid("");
      setAccounts([]);
      return;
    }
    const own: Account = { uid: user.uid, label: "Minha conta", isOwn: true };
    setActiveUid((cur) => cur || user.uid);

    // 1) Registra/atualiza o perfil (alimenta o painel de admin e a resolução de e-mail).
    setDoc(
      doc(db, "profiles", user.uid),
      { email: user.email, name: user.displayName, photoURL: user.photoURL, lastLogin: Date.now() },
      { merge: true },
    ).catch(() => {});

    // 2) Se houver um convite para o meu e-mail, reivindica o acesso.
    (async () => {
      try {
        const email = (user.email || "").toLowerCase();
        if (!email) return;
        const inv = await getDoc(doc(db, "invites", email));
        if (!inv.exists()) return;
        const ownerUid = inv.data().ownerUid as string | undefined;
        if (ownerUid && ownerUid !== user.uid) {
          await setDoc(doc(db, "users", ownerUid, "members", user.uid), { email, joinedAt: Date.now() }, { merge: true }).catch(() => {});
          await setDoc(doc(db, "profiles", user.uid), { memberOf: arrayUnion(ownerUid) }, { merge: true }).catch(() => {});
        }
      } catch { /* ignora */ }
    })();

    // 3) Escuta o meu perfil para saber de quais contas sou membro.
    const unsub = onSnapshot(doc(db, "profiles", user.uid), async (snap) => {
      const memberOf: string[] = snap.exists() ? (snap.data().memberOf ?? []) : [];
      const shared: Account[] = [];
      for (const ownerUid of memberOf) {
        if (ownerUid === user.uid) continue;
        let label = "Conta compartilhada";
        try {
          const op = await getDoc(doc(db, "profiles", ownerUid));
          if (op.exists()) label = op.data().name || op.data().email || label;
        } catch { /* ignora */ }
        shared.push({ uid: ownerUid, label, isOwn: false });
      }
      setAccounts([own, ...shared]);
    });
    return () => unsub();
  }, [user]);

  return <Ctx.Provider value={{ activeUid, setActiveUid, accounts }}>{children}</Ctx.Provider>;
}

export const useAccount = () => useContext(Ctx);
