// Detecta o banco pelo nome do cartão e devolve cor + domínio (para o logo).
// O logo vem do serviço público de logos por domínio; se falhar, o componente
// BankLogo cai num círculo colorido com a inicial.

export interface BankBrand {
  match: RegExp;
  name: string;
  color: string;
  domain: string;
}

const BANKS: BankBrand[] = [
  { match: /nubank|\bnu\b|roxinho/i, name: "Nubank", color: "#820ad1", domain: "nubank.com.br" },
  { match: /ita[úu]/i, name: "Itaú", color: "#ec7000", domain: "itau.com.br" },
  { match: /bradesco/i, name: "Bradesco", color: "#cc092f", domain: "bradesco.com.br" },
  { match: /santander/i, name: "Santander", color: "#ec0000", domain: "santander.com.br" },
  { match: /caixa/i, name: "Caixa", color: "#0070af", domain: "caixa.gov.br" },
  { match: /banco do brasil|\bbb\b/i, name: "Banco do Brasil", color: "#fae128", domain: "bb.com.br" },
  { match: /\binter\b/i, name: "Inter", color: "#ff7a00", domain: "bancointer.com.br" },
  { match: /c6/i, name: "C6 Bank", color: "#1d1d1b", domain: "c6bank.com.br" },
  { match: /\bnext\b/i, name: "Next", color: "#00ff5f", domain: "next.me" },
  { match: /original/i, name: "Original", color: "#00a868", domain: "original.com.br" },
  { match: /\bpan\b/i, name: "Banco PAN", color: "#00b4e6", domain: "bancopan.com.br" },
  { match: /neon/i, name: "Neon", color: "#00aeef", domain: "neon.com.br" },
  { match: /will/i, name: "Will Bank", color: "#ffd200", domain: "willbank.com.br" },
  { match: /picpay/i, name: "PicPay", color: "#11c76f", domain: "picpay.com" },
  { match: /mercado ?pago/i, name: "Mercado Pago", color: "#00b1ea", domain: "mercadopago.com.br" },
  { match: /\bxp\b/i, name: "XP", color: "#0a0a0a", domain: "xpi.com.br" },
  { match: /btg/i, name: "BTG", color: "#0d1b3e", domain: "btgpactual.com" },
  { match: /sicoob/i, name: "Sicoob", color: "#003641", domain: "sicoob.com.br" },
  { match: /sicredi/i, name: "Sicredi", color: "#3fa535", domain: "sicredi.com.br" },
  { match: /ame(\b|rica)/i, name: "Ame", color: "#ff0073", domain: "amedigital.com" },
  // Vale refeição / alimentação
  { match: /caju/i, name: "Caju", color: "#ff5436", domain: "caju.com.br" },
  { match: /alelo/i, name: "Alelo", color: "#e30613", domain: "alelo.com.br" },
  { match: /\bvr\b|vale refei/i, name: "VR", color: "#007a3e", domain: "vr.com.br" },
  { match: /sodexo|pluxee/i, name: "Pluxee", color: "#221c46", domain: "pluxee.com.br" },
  { match: /ticket/i, name: "Ticket", color: "#e2001a", domain: "ticket.com.br" },
  { match: /flash/i, name: "Flash", color: "#ff4338", domain: "flashapp.com.br" },
  { match: /\bben\b|benvisa/i, name: "Ben", color: "#00a3e0", domain: "benbeneficios.com.br" },
];

export function detectBank(name: string): BankBrand | null {
  if (!name) return null;
  return BANKS.find((b) => b.match.test(name)) ?? null;
}

export function bankLogoUrl(domain: string): string {
  // Serviço de ícones do Google — confiável e gratuito; puxa o logo do banco.
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
