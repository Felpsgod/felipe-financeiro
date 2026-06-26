import { db } from "../lib/firebase.js";
import { parseMessage } from "../lib/parse.js";

const GRAPH_VERSION = "v21.0";

export default async function handler(req, res) {
  // 1) Verificação do webhook (Meta faz um GET ao configurar a URL).
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Token de verificação inválido");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Método não permitido");
  }

  // 2) Mensagem recebida. Sempre respondemos 200 rápido para o WhatsApp
  //    não reenviar; o processamento acontece em seguida.
  try {
    const entry = req.body?.entry?.[0];
    const value = entry?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    // Atualizações de status (entregue/lido) não têm `messages` — ignoramos.
    if (!message || message.type !== "text") {
      return res.status(200).send("ok");
    }

    const sender = message.from; // número no formato internacional, ex: 5511999999999
    const text = message.text.body;

    // Só aceita mensagens do seu próprio número (lista branca).
    const allowed = process.env.ALLOWED_SENDER;
    if (allowed && sender !== allowed) {
      return res.status(200).send("ignorado");
    }

    const uid = process.env.APP_USER_UID;
    if (!uid) throw new Error("APP_USER_UID não configurado");

    const firestore = db();

    // Carrega os cartões do usuário para o parser reconhecer.
    const cardsSnap = await firestore.collection("users").doc(uid).collection("cards").get();
    const cards = cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const cardNames = cards.map((c) => c.name);

    // Interpreta a mensagem com a Claude.
    const parsed = await parseMessage(text, cardNames);

    // Casa o nome do cartão retornado com um cartão real (case-insensitive).
    let cardId;
    if (parsed.cardName) {
      const match = cards.find(
        (c) => c.name.toLowerCase() === String(parsed.cardName).toLowerCase(),
      );
      if (match) cardId = match.id;
    }

    const transaction = {
      description: parsed.description,
      amount: Math.abs(Number(parsed.amount) || 0),
      date: parsed.date,
      category: parsed.category,
      type: parsed.type,
      paid: cardId ? false : true, // gasto no cartão entra na fatura (em aberto)
      createdAt: Date.now(),
      source: "whatsapp",
      ...(cardId ? { cardId } : {}),
    };

    await firestore.collection("users").doc(uid).collection("transactions").add(transaction);

    // Confirma para o usuário no WhatsApp.
    const cardLabel = cardId ? ` (${parsed.cardName})` : "";
    const valor = transaction.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    await sendWhatsApp(sender, `✅ Registrado: ${valor} — ${parsed.description}${cardLabel} [${parsed.category}]`);

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Erro no webhook:", err);
    // Tenta avisar o usuário do erro, mas sem quebrar a resposta 200.
    try {
      const sender = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      if (sender) await sendWhatsApp(sender, "⚠️ Não consegui registrar. Tente reescrever, ex: 'Gastei 100 no Itaú'.");
    } catch {}
    return res.status(200).send("ok");
  }
}

async function sendWhatsApp(to, body) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}
