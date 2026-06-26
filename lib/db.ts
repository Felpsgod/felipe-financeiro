import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

// Helpers genéricos de CRUD. Tudo vive sob `users/{uid}/<collection>`,
// alinhado com as regras de segurança (firestore.rules).

function colRef(uid: string, name: string) {
  return collection(db, "users", uid, name);
}

/**
 * Escuta uma coleção em tempo real. Retorna a função de unsubscribe.
 * `cb` recebe a lista de itens já com o `id` do documento embutido.
 */
export function watchCollection<T>(
  uid: string,
  name: string,
  cb: (items: (T & { id: string })[]) => void,
  ...constraints: QueryConstraint[]
) {
  const q = query(colRef(uid, name), ...constraints);
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
    cb(items);
  });
}

export function watchByDateDesc<T>(
  uid: string,
  name: string,
  cb: (items: (T & { id: string })[]) => void,
) {
  return watchCollection<T>(uid, name, cb, orderBy("date", "desc"));
}

export async function addItem<T extends Record<string, unknown>>(
  uid: string,
  name: string,
  data: T,
) {
  const ref = await addDoc(colRef(uid, name), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateItem(
  uid: string,
  name: string,
  id: string,
  data: Record<string, unknown>,
) {
  await updateDoc(doc(db, "users", uid, name, id), data);
}

export async function deleteItem(uid: string, name: string, id: string) {
  await deleteDoc(doc(db, "users", uid, name, id));
}
