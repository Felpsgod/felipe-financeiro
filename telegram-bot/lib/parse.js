import Anthropic from "@anthropic-ai/sdk";

const CATEGORIES = [
  "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer",
  "Compras", "Assinaturas", "Financiamento", "Fatura de cartão", "Salário", "Outros",
];

// Modelo padrão: Claude Opus 4.8. Para reduzir custo numa interpretação simples
// como esta, você pode trocar para "claude-haiku-4-5" via env CLAUDE_MODEL.
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

const anthropic = new Anthropic(); // lê ANTHROPIC_API_KEY do ambiente

/**
 * Interpreta uma mensagem em linguagem natural (ex: "Gastei 100 reais no Itaú")
 * e extrai um lançamento estruturado. `cardNames` ajuda o modelo a reconhecer
 * cartões já cadastrados pelo usuário.
 */
export async function parseMessage(text, cardNames) {
  const today = new Date().toISOString().slice(0, 10);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      description: { type: "string", description: "Descrição curta do gasto/receita" },
      amount: { type: "number", description: "Valor em reais, sempre positivo" },
      type: { type: "string", enum: ["expense", "income", "payment"] },
      category: { type: "string", enum: CATEGORIES },
      cardName: {
        type: ["string", "null"],
        description: "Nome do cartão/banco citado, se houver. Senão null.",
      },
      date: { type: "string", description: "Data no formato YYYY-MM-DD" },
    },
    required: ["description", "amount", "type", "category", "cardName", "date"],
  };

  const system = [
    "Você extrai lançamentos financeiros de mensagens em português do Brasil.",
    `Hoje é ${today}. Se a mensagem não indicar data, use hoje.`,
    "type: 'expense' para gastos, 'income' para recebimentos (ex: salário), 'payment' para pagamento de fatura/parcela.",
    cardNames.length
      ? `Cartões cadastrados do usuário: ${cardNames.join(", ")}. Se a mensagem citar um deles (ou algo parecido), preencha cardName com o nome exato da lista.`
      : "O usuário não tem cartões cadastrados; deixe cardName como null.",
    "Escolha a categoria mais adequada da lista permitida.",
  ].join(" ");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: text }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Resposta da Claude sem conteúdo de texto");
  return JSON.parse(textBlock.text);
}
