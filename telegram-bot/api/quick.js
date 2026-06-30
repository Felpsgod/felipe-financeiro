import { db } from "../lib/firebase.js";
import { parseMessage } from "../lib/parse.js";
import { registerEntry } from "../lib/register.js";

// Endpoint chamado pelo PRÓPRIO app (caixa de texto no Resumo).
// Valida o login do Firebase via API REST (evita o firebase-admin/auth, que
// quebra na Vercel por causa do módulo ESM "jose").
const ALLOW_ORIGIN = process.env.APP_ORIGIN || "*";
// Chave Web do Firebase (pública por design). Pode sobrescrever via env.
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyBOnULJEIkPjVxgRsKDaELEQDuji8a7Ax4";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

/** Verifica o ID token do Firebase e retorna o uid (via Identity Toolkit REST). */
async function verifyUid(idToken) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!res.ok) throw new Error(`token inválido (${res.status})`);
  const data = await res.json();
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new Error("não foi possível identificar o usuário");
  return uid;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "método não permitido" });

  try {
    const authz = req.headers.authorization || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: "sem token de autenticação" });

    const uid = await verifyUid(token);
    const text = (req.body?.text || "").toString().trim();
    if (!text) return res.status(400).json({ ok: false, error: "texto vazio" });

    const firestore = db();
    const userRef = firestore.collection("users").doc(uid);

    let provider;
    try {
      const cfg = await userRef.collection("settings").doc("ai").get();
      if (cfg.exists) provider = cfg.data().provider;
    } catch { /* usa padrão */ }

    const cardsSnap = await userRef.collection("cards").get();
    const cards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const parsed = await parseMessage(text, cards.map((c) => c.name), provider);

    const result = await registerEntry(userRef, parsed, text, cards);
    return res.status(200).json(result);
  } catch (err) {
    console.error("quick error:", err);
    return res.status(200).json({ ok: false, error: err?.message || String(err) });
  }
}
