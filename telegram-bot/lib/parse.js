// Parser multi-IA: interpreta a mensagem e devolve o lançamento estruturado.
// Provedor escolhido pelo app (Firestore) ou pela env AI_PROVIDER.
// Padrão = deepseek (mais barato). Cada provedor usa sua própria chave.

const CATEGORIES = [
  "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer",
  "Compras", "Assinaturas", "Financiamento", "Fatura de cartão", "Salário", "Outros",
];

function systemPrompt(cardNames) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "Você extrai lançamentos financeiros de mensagens em português do Brasil.",
    `Hoje é ${today}. Se a mensagem não indicar data, use hoje.`,
    "Responda APENAS com um objeto JSON (sem texto antes ou depois) com as chaves:",
    "description (string curta), amount (número positivo em reais),",
    "type ('expense' para gasto, 'income' para recebimento, 'payment' para pagamento de fatura/parcela),",
    `category (uma destas: ${CATEGORIES.join(", ")}),`,
    "cardName (nome do cartão/banco citado ou null),",
    "date (formato YYYY-MM-DD).",
    cardNames.length
      ? `Cartões cadastrados: ${cardNames.join(", ")}. Se a mensagem citar um deles, use o nome exato em cardName.`
      : "O usuário não tem cartões cadastrados; use null em cardName.",
  ].join(" ");
}

function extractJSON(s) {
  if (!s) throw new Error("resposta vazia da IA");
  const m = s.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : s);
}

/** Provedores compatíveis com a API da OpenAI (DeepSeek e OpenAI). */
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
  if (!key) throw new Error("chave de API do Gemini (GEMINI_API_KEY) não configurada");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
  if (!key) throw new Error("chave de API da Claude (ANTHROPIC_API_KEY) não configurada");
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
  const block = data.content?.find((b) => b.type === "text");
  return extractJSON(block?.text);
}

export async function parseMessage(text, cardNames, provider) {
  const p = (provider || process.env.AI_PROVIDER || "deepseek").toLowerCase();
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
    default:
      return viaOpenAICompat({
        url: "https://api.deepseek.com/chat/completions",
        key: process.env.DEEPSEEK_API_KEY,
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        system, text, label: "DeepSeek",
      });
  }
}
