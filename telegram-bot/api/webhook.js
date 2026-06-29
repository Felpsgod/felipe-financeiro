import { db } from "../lib/firebase.js";
import { parseMessage } from "../lib/parse.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Telegram webhook ativo.");
  }

  // Proteção opcional: o Telegram envia este header se você configurar um
  // secret_token no setWebhook.
  const secret = process.env.TELEGRAM_SECRET_TOKEN;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).send("não autorizado");
  }

  try {
    const message = req.body?.message || req.body?.edited_message;
    const text = message?.text;
    const chatId = message?.chat?.id;

    if (!text || !chatId) return res.status(200).send("ok"); // ignora não-texto

    const allowed = process.env.ALLOWED_CHAT_ID;

    // 1ª vez: ajuda você a descobrir seu chat ID.
    if (!allowed) {
      await sendTelegram(chatId, `Seu chat ID é: ${chatId}\n\nAdicione esse número na variável ALLOWED_CHAT_ID do robô (na Vercel) e me mande de novo.`);
      return res.status(200).send("ok");
    }
    // Só aceita você.
    if (String(chatId) !== String(allowed)) {
      return res.status(200).send("ignorado");
    }

    const uid = process.env.APP_USER_UID;
    if (!uid) throw new Error("APP_USER_UID não configurado");

    const firestore = db();
    const cardsSnap = await firestore.collection("users").doc(uid).collection("cards").get();
    const cards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const cardNames = cards.map((c) => c.name);

    const parsed = await parseMessage(text, cardNames);

    let cardId;
    if (parsed.cardName) {
      const match = cards.find((c) => c.name.toLowerCase() === String(parsed.cardName).toLowerCase());
      if (match) cardId = match.id;
    }

    const transaction = {
      description: parsed.description,
      amount: Math.abs(Number(parsed.amount) || 0),
      date: parsed.date,
      category: parsed.category,
      type: parsed.type,
      paid: cardId ? false : true,
      createdAt: Date.now(),
      source: "telegram",
      ...(cardId ? { cardId } : {}),
    };

    await firestore.collection("users").doc(uid).collection("transactions").add(transaction);

    const cardLabel = cardId ? ` (${parsed.cardName})` : "";
    const valor = transaction.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    await sendTelegram(chatId, `✅ Registrado: ${valor} — ${parsed.description}${cardLabel} [${parsed.category}]`);

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Erro no webhook:", err);
    try {
      const chatId = (req.body?.message || req.body?.edited_message)?.chat?.id;
      if (chatId) await sendTelegram(chatId, "⚠️ Não consegui registrar. Tente reescrever, ex: 'Gastei 100 no Itaú'.");
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
