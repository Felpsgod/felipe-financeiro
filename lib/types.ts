// Modelos de dados do app. Todos os documentos ficam sob
// `users/{uid}/<colecao>` no Firestore, isolando os dados por usuário.

export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "outro";

/** credito: fatura mensal (vencimento). alimentacao: vale refeição/alimentação (saldo, recebimento). */
export type CardKind = "credito" | "alimentacao";

export interface Card {
  id: string;
  name: string; // ex: "Nubank", "Itaú Click", "Caju"
  brand: CardBrand;
  kind: CardKind; // crédito ou alimentação/refeição
  limit: number; // limite total (crédito) ou saldo mensal (alimentação)
  closingDay: number; // dia do fechamento da fatura (crédito)
  dueDay: number; // dia do vencimento (crédito)
  receivingDay: number; // dia do recebimento do benefício (alimentação)
  color: string; // cor para identificar visualmente (hex)
  createdAt: number;
}

export interface Financing {
  id: string;
  description: string; // ex: "Financiamento do carro"
  totalAmount: number; // valor total financiado
  installments: number; // número total de parcelas
  paidInstallments: number; // quantas já foram pagas
  installmentValue: number; // valor de cada parcela
  dueDay: number; // dia do vencimento mensal (1-31)
  startDate: string; // YYYY-MM-DD da 1ª parcela
  createdAt: number;
}

export type TransactionType = "expense" | "income" | "payment";

export interface Transaction {
  id: string;
  description: string;
  amount: number; // sempre positivo; o sinal vem do `type`
  date: string; // YYYY-MM-DD
  category: string;
  type: TransactionType; // despesa, receita ou pagamento de fatura/parcela
  cardId?: string; // se foi gasto no cartão
  cardKind?: CardKind; // tipo do cartão no momento do gasto (para cálculo da fatura)
  financingId?: string; // se é parcela de financiamento
  paid: boolean; // já foi pago/quitado?
  createdAt: number;
}

/** Conta fixa/recorrente: aparece automaticamente em todo mês a partir de `startMonth`. */
export interface Recurring {
  id: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  dayOfMonth: number; // dia do mês (1-31)
  startMonth: string; // YYYY-MM — mês a partir do qual passa a valer
  active: boolean;
  createdAt: number;
}

/** Compra parcelada no cartão de crédito (ex: sofá 18x). Gera 1 parcela por mês. */
export interface Installment {
  id: string;
  description: string;
  totalAmount: number; // valor total da compra
  count: number; // número de parcelas
  cardId: string;
  cardKind?: CardKind;
  category: string;
  firstMonth: string; // YYYY-MM da fatura da 1ª parcela
  day: number; // dia para exibir nas listas
  createdAt: number;
}

export const CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Assinaturas",
  "Financiamento",
  "Fatura de cartão",
  "Salário",
  "Outros",
] as const;
