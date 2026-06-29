import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Inicializa o Firebase Admin uma única vez (reaproveitado entre invocações
// da função serverless). A credencial vem da variável de ambiente
// FIREBASE_SERVICE_ACCOUNT, que contém o JSON da conta de serviço.
function init() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado");
  const serviceAccount = JSON.parse(raw);
  initializeApp({ credential: cert(serviceAccount) });
}

export function db() {
  init();
  return getFirestore();
}
