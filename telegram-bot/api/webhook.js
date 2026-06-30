import { db } from "../lib/firebase.js";
import { parseMessage } from "../lib/parse.js";
import { registerEntry } from "../lib/register.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Telegram webhook ativo.");
  }

  const secret = process.env.TELEGRAM_SECRET_TOKEN;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).send("não autorizado");
  }

  try {
    const message = req.body?.message || req.body?.edited_message;
    const text = message?.text;
    const chatId = message?.chat?.id;
    if (!text || !chatId) return res.status(200).send("ok");

    const allowed = process.env.ALLOWED_CHAT_ID;
    if (!allowed) {
      await sendTelegram(chatId, `Seu chat ID é: ${chatId}\n\nAdicione esse número na variável ALLOWED_CHAT_ID do robô (na Vercel) e me mande de novo.`);
      return res.status(200).send("ok");
    }
    if (String(chatId) !== String(allowed)) return res.status(200).send("ignorado");

    const uid = process.env.APP_USER_UID;
    if (!uid) throw new Error("APP_USER_UID não configurado");

    const firestore = db();
    const userRef = firestore.collection("users").doc(uid);

    // Provedor de IA escolhido no app (users/{uid}/settings/ai). Fallback: env.
    let provider;
    try {
      const cfg = await userRef.collection("settings").doc("ai").get();
      if (cfg.exists) provider = cfg.data().provider;
    } catch { /* sem config: usa o padrão */ }

    const cardsSnap = await userRef.collection("cards").get();
    const cards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const cardNames = cards.map((c) => c.name);

    const parsed = await parseMessage(text, cardNames, provider);
    const { message: reply } = await registerEntry(userRef, parsed, text, cards);
    await sendTelegram(chatId, reply);

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Erro no webhook:", err);
    try {
      const chatId = (req.body?.message || req.body?.edited_message)?.chat?.id;
      // Mostra o motivo real para facilitar o diagnóstico.
      if (chatId) await sendTelegram(chatId, `⚠️ Erro ao registrar: ${err?.message || err}`);
    } catch {}
    return res.status(200).send("ok");
  }
}

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
