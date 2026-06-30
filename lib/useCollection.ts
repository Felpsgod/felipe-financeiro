"use client";

import { useEffect, useState } from "react";
import { orderBy } from "firebase/firestore";
import { useAccount } from "./account";
import { watchCollection } from "./db";

/**
 * Escuta uma coleção da conta ATIVA (própria ou compartilhada) em tempo real.
 * `sortByDateDesc` ordena por data (campo `date`) decrescente.
 */
export function useCollection<T>(name: string, sortByDateDesc = false) {
  const { activeUid } = useAccount();
  const [items, setItems] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUid) return;
    setLoading(true);
    const unsub = watchCollection<T>(
      activeUid,
      name,
      (data) => {
        setItems(data);
        setLoading(false);
      },
      ...(sortByDateDesc ? [orderBy("date", "desc")] : []),
    );
    return () => unsub();
  }, [activeUid, name, sortByDateDesc]);

  return { items, loading };
}
