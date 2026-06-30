// Recebe o resultado do parser e grava no Firestore conforme a intenção:
// lançamento normal, conta fixa (recurring) ou pagamento de financiamento.
// Usado tanto pelo webhook do Telegram quanto pela rota /api/quick do app.

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
function norm(s) {
  return (s || "").normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}
function brl(n) {
  return (Math.abs(Number(n) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addMonthStr(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function findFinancing(userRef, text) {
  const snap = await userRef.collection("financings").get();
  const fins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return fins.find((f) => f.description && norm(text).includes(norm(f.description)))
    || fins.find((f) => f.description && norm(f.description).split(/\s+/).some((w) => w.length > 3 && norm(text).includes(w)))
    || null;
}

export async function registerEntry(userRef, parsed, text, cards) {
  const amount = Math.abs(Number(parsed.amount) || 0);

  // --- Conta fixa (recorrente) ---
  if (parsed.intent === "recurring") {
    const day = Math.min(31, Math.max(1, Number(parsed.dayOfMonth) || 5));
    await userRef.collection("recurring").add({
      description: parsed.description,
      amount,
      type: parsed.type === "income" ? "income" : "expense",
      category: parsed.category,
      dayOfMonth: day,
      startMonth: currentMonthStr(),
      active: true,
      createdAt: Date.now(),
      source: "chat",
    });
    return { ok: true, message: `📌 Conta fixa: ${brl(amount)} — ${parsed.description} (todo dia ${day})` };
  }

  // --- Estorno de parcela de financiamento (desfazer) ---
  if (parsed.intent === "financing_undo") {
    const match = await findFinancing(userRef, text);
    if (match) {
      const paid = Math.max((match.paidInstallments || 0) - 1, 0);
      await userRef.collection("financings").doc(match.id).update({ paidInstallments: paid });
      // Remove o pagamento mais recente desse financiamento (se houver).
      try {
        const pays = await userRef.collection("transactions").where("financingId", "==", match.id).get();
        let last = null;
        pays.forEach((d) => { const x = { id: d.id, ...d.data() }; if (!last || (x.createdAt || 0) > (last.createdAt || 0)) last = x; });
        if (last) await userRef.collection("transactions").doc(last.id).delete();
      } catch { /* ignora */ }
      return { ok: true, message: `🔙 Parcela estornada: ${match.description} (${paid}/${match.installments})` };
    }
    return { ok: true, message: "Não encontrei esse financiamento para estornar." };
  }

  // --- Pagamento de parcela de financiamento ---
  if (parsed.intent === "financing") {
    const match = await findFinancing(userRef, text);
    if (match) {
      const paid = Math.min((match.paidInstallments || 0) + 1, match.installments || 0);
      await userRef.collection("financings").doc(match.id).update({ paidInstallments: paid });
      await userRef.collection("transactions").add({
        description: `Parcela — ${match.description}`,
        amount: match.installmentValue || amount,
        date: new Date().toISOString().slice(0, 10),
        category: "Financiamento",
        type: "payment",
        paid: true,
        financingId: match.id,
        createdAt: Date.now(),
        source: "chat",
      });
      return { ok: true, message: `🏦 Parcela paga: ${match.description} (${paid}/${match.installments})` };
    }
    // Não achou financiamento: segue como pagamento normal.
  }

  // Cartão (busca por nome).
  let card;
  if (parsed.cardName) {
    card = (cards || []).find((c) => norm(c.name) === norm(parsed.cardName))
      || (cards || []).find((c) => norm(c.name).includes(norm(parsed.cardName)));
  }

  // --- Compra parcelada no cartão de crédito ("sofá 18x no Caixa") ---
  const count = Number(parsed.installments) || 1;
  if (count > 1 && card && card.kind !== "alimentacao") {
    await userRef.collection("installments").add({
      description: parsed.description,
      totalAmount: amount,
      count,
      cardId: card.id,
      cardKind: card.kind || "credito",
      category: parsed.category,
      firstMonth: addMonthStr((parsed.date || "").slice(0, 7) || currentMonthStr(), 1), // 1ª parcela na fatura do mês seguinte à compra
      day: new Date((parsed.date || new Date().toISOString().slice(0, 10)) + "T12:00:00").getDate(),
      createdAt: Date.now(),
      source: "chat",
    });
    return {
      ok: true,
      message: `🛋️ Parcelado: ${parsed.description} ${count}x de ${brl(amount / count)} (total ${brl(amount)}) no ${card.name}`,
    };
  }

  // --- Lançamento normal ---
  const cardId = card?.id;
  const transaction = {
    description: parsed.description,
    amount,
    date: parsed.date,
    category: parsed.category,
    type: parsed.type,
    paid: cardId ? false : true,
    createdAt: Date.now(),
    source: "chat",
    ...(cardId ? { cardId, cardKind: card.kind || "credito" } : {}),
  };
  await userRef.collection("transactions").add(transaction);
  const cardLabel = cardId ? ` (${parsed.cardName})` : "";
  return { ok: true, message: `✅ Registrado: ${brl(amount)} — ${parsed.description}${cardLabel} [${parsed.category}]` };
}
