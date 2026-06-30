import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  where,
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

/** Lê/escuta um documento único (ex: settings/ai) em tempo real. */
export function watchDoc<T>(
  uid: string,
  name: string,
  id: string,
  cb: (data: (T & { id: string }) | null) => void,
) {
  return onSnapshot(doc(db, "users", uid, name, id), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as T) }) : null);
  });
}

/** Cria/atualiza um documento único (merge). */
export async function setDocData(
  uid: string,
  name: string,
  id: string,
  data: Record<string, unknown>,
) {
  await setDoc(doc(db, "users", uid, name, id), data, { merge: true });
}

// ----- Compartilhamento / Admin -----

/** Convida alguém (por e-mail) a acessar as MINHAS finanças. */
export async function setInvite(ownerUid: string, ownerEmail: string, ownerName: string, email: string) {
  await setDoc(doc(db, "invites", email.toLowerCase()), {
    ownerUid, ownerEmail, ownerName, access: "full", createdAt: Date.now(),
  });
}

export async function deleteInvite(email: string) {
  await deleteDoc(doc(db, "invites", email.toLowerCase()));
}

/** Escuta os convites que EU enviei. */
export function watchMyInvites(
  ownerUid: string,
  cb: (items: { id: string; ownerEmail?: string; ownerName?: string }[]) => void,
) {
  const q = query(collection(db, "invites"), where("ownerUid", "==", ownerUid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

/** Escuta as pessoas que já têm acesso às MINHAS finanças. */
export function watchMembers(
  ownerUid: string,
  cb: (items: { id: string; email?: string }[]) => void,
) {
  return onSnapshot(collection(db, "users", ownerUid, "members"), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

export async function removeMember(ownerUid: string, memberUid: string) {
  await deleteDoc(doc(db, "users", ownerUid, "members", memberUid));
}

/** Lista todos os perfis (para o painel de admin). */
export function watchProfiles(
  cb: (items: { id: string; email?: string; name?: string; photoURL?: string; lastLogin?: number }[]) => void,
) {
  return onSnapshot(collection(db, "profiles"), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}
