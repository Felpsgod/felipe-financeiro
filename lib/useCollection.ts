"use client";

import { useEffect, useState } from "react";
import { orderBy } from "firebase/firestore";
import { useAuth } from "./auth";
import { watchCollection } from "./db";

/**
 * Escuta uma coleção do usuário logado em tempo real.
 * `sortByDateDesc` ordena por data (campo `date`) decrescente.
 */
export function useCollection<T>(name: string, sortByDateDesc = false) {
  const { user } = useAuth();
  const [items, setItems] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = watchCollection<T>(
      user.uid,
      name,
      (data) => {
        setItems(data);
        setLoading(false);
      },
      ...(sortByDateDesc ? [orderBy("date", "desc")] : []),
    );
    return () => unsub();
  }, [user, name, sortByDateDesc]);

  return { items, loading };
}
