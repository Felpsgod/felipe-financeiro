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

  // --- Pagamento de parcela de financiamento ---
  if (parsed.intent === "financing") {
    const snap = await userRef.collection("financings").get();
    const fins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const match = fins.find((f) => f.description && norm(text).includes(norm(f.description)))
      || fins.find((f) => f.description && norm(f.description).split(/\s+/).some((w) => w.length > 3 && norm(text).includes(w)));

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

  // --- Lançamento normal ---
  let cardId;
  if (parsed.cardName) {
    const m = (cards || []).find((c) => norm(c.name) === norm(parsed.cardName));
    if (m) cardId = m.id;
  }
  const transaction = {
    description: parsed.description,
    amount,
    date: parsed.date,
    category: parsed.category,
    type: parsed.type,
    paid: cardId ? false : true,
    createdAt: Date.now(),
    source: "chat",
    ...(cardId ? { cardId } : {}),
  };
  await userRef.collection("transactions").add(transaction);
  const cardLabel = cardId ? ` (${parsed.cardName})` : "";
  return { ok: true, message: `✅ Registrado: ${brl(amount)} — ${parsed.description}${cardLabel} [${parsed.category}]` };
}
