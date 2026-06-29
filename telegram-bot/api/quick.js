import { db } from "../lib/firebase.js";
import { parseMessage } from "../lib/parse.js";

// Endpoint chamado pelo PRÓPRIO app (caixa de texto no Resumo). Valida o login
// do Firebase (ID token) para saber quem é o usuário, de forma segura.
const ALLOW_ORIGIN = process.env.APP_ORIGIN || "*";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "método não permitido" });

  try {
    const authz = req.headers.authorization || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: "sem token de autenticação" });

    const firestore = db();
    // import dinâmico: evita falha no carregamento do módulo (mantém GET/OPTIONS ok).
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const text = (req.body?.text || "").toString().trim();
    if (!text) return res.status(400).json({ ok: false, error: "texto vazio" });

    const userRef = firestore.collection("users").doc(uid);

    let provider;
    try {
      const cfg = await userRef.collection("settings").doc("ai").get();
      if (cfg.exists) provider = cfg.data().provider;
    } catch { /* usa padrão */ }

    const cardsSnap = await userRef.collection("cards").get();
    const cards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const parsed = await parseMessage(text, cards.map((c) => c.name), provider);

    let cardId;
    if (parsed.cardName) {
      const m = cards.find((c) => c.name.toLowerCase() === String(parsed.cardName).toLowerCase());
      if (m) cardId = m.id;
    }

    const transaction = {
      description: parsed.description,
      amount: Math.abs(Number(parsed.amount) || 0),
      date: parsed.date,
      category: parsed.category,
      type: parsed.type,
      paid: cardId ? false : true,
      createdAt: Date.now(),
      source: "app",
      ...(cardId ? { cardId } : {}),
    };
    await userRef.collection("transactions").add(transaction);

    return res.status(200).json({ ok: true, transaction });
  } catch (err) {
    console.error("quick error:", err);
    return res.status(200).json({ ok: false, error: err?.message || String(err) });
  }
}
