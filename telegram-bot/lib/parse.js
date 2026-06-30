// Parser multi-modo: interpreta a mensagem e devolve o lançamento estruturado.
// Provedor escolhido no app (Firestore) ou na env AI_PROVIDER.
// Padrão = "local" (grátis, sem IA, sem chave, sem cota).
// Opções de IA (precisam de chave/crédito): deepseek, openai, gemini, claude.

const CATEGORIES = [
  "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer",
  "Compras", "Assinaturas", "Financiamento", "Fatura de cartão", "Salário", "Outros",
];

// ---------- Interpretador local (grátis) ----------

const CAT_RULES = [
  ["Transporte", /uber|99|t[áa]xi|gasolina|combust|[ôo]nibus|metr[ôo]|passagem|transporte|estacionamento|bilhete/],
  ["Alimentação", /mercado|supermercado|comida|almo[çc]o|jantar|janta|lanche|restaurante|ifood|padaria|caf[ée]|pizza|burger|hamb[úu]rg|feira/],
  ["Moradia", /aluguel|condom[íi]nio|luz|energia|[áa]gua|g[áa]s|internet|\bnet\b/],
  ["Saúde", /farm[áa]cia|rem[ée]dio|m[ée]dico|consulta|dentista|exame|hospital|sa[úu]de/],
  ["Educação", /curso|faculdade|escola|livro|mensalidade|aula|udemy|alura/],
  ["Assinaturas", /netflix|spotify|prime|disney|hbo|assinatura|youtube premium/],
  ["Lazer", /cinema|bar|balada|show|viagem|jogo|\bgame\b|parque|lazer/],
  ["Compras", /loja|roupa|shopping|magazine|americanas|mercado livre|shopee|aliexpress|comprei/],
  ["Salário", /sal[áa]rio|holerite/],
  ["Fatura de cartão", /fatura/],
  ["Financiamento", /financiamento|presta[çc][ãa]o|parcela do/],
];

function parseAmount(text) {
  const t = text.replace(/r\$/gi, " ");
  const m = t.match(/\d[\d.,]*/);
  if (!m) return 0;
  let s = m[0];
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) || []).length === 1) {
    const after = s.split(".")[1];
    if (after && after.length === 3) s = s.replace(".", ""); // 1.000 = milhar
  } else {
    s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Remove acentos e baixa a caixa, para comparar "Itaú" com "itau".
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
function norm(s) {
  return (s || "").normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

/** Extrai a descrição (o "lugar"), tirando valor, verbo e a menção do banco. */
function buildDescription(text, cardName) {
  let d = text.replace(/r\$/gi, " ");
  d = d.replace(/\d[\d.,]*/, " ");                       // remove o valor
  d = d.replace(/\b(reais|real|conto|pila)\b/gi, " ");
  d = d.replace(/^\s*(gastei|paguei|comprei|gasto|recebi|ganhei|paguei de|comprei em|foi)\b/i, " ");

  // Remove a última menção "no/na/em <banco>" se corresponder ao cartão.
  if (cardName) {
    const m = d.match(/^(.*\S)\s+(?:no|na|em|pelo|pela|cart[ãa]o)\s+(\S.*)$/i);
    if (m) {
      const after = norm(m[2]);
      const card0 = norm(cardName.split(/\s+/)[0]);
      if (after.includes(card0) || norm(cardName).includes(after)) d = m[1];
    }
  }

  d = d.replace(/^\s*(no|na|em|de|do|da)\s+/i, " ").replace(/\s+/g, " ").trim();
  return d ? d.charAt(0).toUpperCase() + d.slice(1) : null;
}

function parseLocal(text, cardNames) {
  const t = norm(text);

  const isIncome = /recebi|ganhei|salario|entrou|recebimento|pix recebido|vendi|caiu/.test(t);
  const isPayment = !isIncome && /fatura|parcela/.test(t);
  const type = isIncome ? "income" : isPayment ? "payment" : "expense";

  let category = "Outros";
  for (const [cat, re] of CAT_RULES) {
    if (re.test(text)) { category = cat; break; }
  }
  if (isIncome && category === "Outros") category = "Salário";

  // Cartão: casa pelo nome cadastrado (sem acento).
  let cardName = null;
  for (const name of cardNames) {
    if (name && t.includes(norm(name))) { cardName = name; break; }
  }

  const now = new Date();
  if (/ontem/.test(t)) now.setDate(now.getDate() - 1);
  const date = now.toISOString().slice(0, 10);

  const description =
    buildDescription(text, cardName) ||
    (text.trim().charAt(0).toUpperCase() + text.trim().slice(1));

  // Intenção: conta fixa, pagamento de financiamento ou lançamento normal.
  let intent = "transaction";
  if (/\b(conta fixa|despesa fixa|gasto fixo|mensal|todo mes|todo dia|recorrente|fixa)\b/.test(t)) intent = "recurring";
  else if (/\b(financiamento|prestacao|parcela do|parcela da)\b/.test(t)) intent = "financing";

  // Dia do mês (para conta fixa): "todo dia 10".
  const dayM = t.match(/\bdia\s+(\d{1,2})\b/);
  const dayOfMonth = dayM ? Number(dayM[1]) : new Date().getDate();

  return { description, amount: parseAmount(text), type, category, cardName, date, intent, dayOfMonth };
}

// ---------- Provedores de IA ----------

function systemPrompt(cardNames) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "Você extrai lançamentos financeiros de mensagens em português do Brasil.",
    `Hoje é ${today}. Se a mensagem não indicar data, use hoje.`,
    "Responda APENAS com um objeto JSON com as chaves: description (string),",
    "amount (número positivo), type ('expense'|'income'|'payment'),",
    `category (uma de: ${CATEGORIES.join(", ")}), cardName (string ou null), date (YYYY-MM-DD),`,
    "intent ('transaction' normal, 'recurring' se for conta fixa/mensal, 'financing' se for pagamento de parcela de financiamento),",
    "dayOfMonth (número do dia do mês, use quando for conta fixa; senão o dia de hoje).",
    cardNames.length ? `Cartões cadastrados: ${cardNames.join(", ")}.` : "Sem cartões; cardName = null.",
  ].join(" ");
}

function extractJSON(s) {
  if (!s) throw new Error("resposta vazia da IA");
  const m = s.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : s);
}

async function viaOpenAICompat({ url, key, model, system, text, label }) {
  if (!key) throw new Error(`chave de API do ${label} não configurada`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: text }],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return extractJSON(data.choices?.[0]?.message?.content);
}

async function viaGemini({ system, text }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function viaClaude({ system, text }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-opus-4-8",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: text }],
    }),
  });
  if (!res.ok) throw new Error(`Claude HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return extractJSON(data.content?.find((b) => b.type === "text")?.text);
}

export async function parseMessage(text, cardNames, provider) {
  const p = (provider || process.env.AI_PROVIDER || "local").toLowerCase();
  const system = systemPrompt(cardNames);

  switch (p) {
    case "openai":
    case "gpt":
      return viaOpenAICompat({
        url: "https://api.openai.com/v1/chat/completions",
        key: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        system, text, label: "OpenAI",
      });
    case "gemini":
      return viaGemini({ system, text });
    case "claude":
    case "anthropic":
      return viaClaude({ system, text });
    case "deepseek":
      return viaOpenAICompat({
        url: "https://api.deepseek.com/chat/completions",
        key: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        system, text, label: "DeepSeek",
      });
    case "local":
    default:
      return parseLocal(text, cardNames);
  }
}
