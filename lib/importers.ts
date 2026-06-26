import Papa from "papaparse";

export interface ParsedTxn {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // negativo = saída, positivo = entrada
}

/** Converte uma data OFX (YYYYMMDD ou YYYYMMDDHHMMSS) para YYYY-MM-DD. */
function ofxDate(raw: string): string {
  const m = raw.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : raw.slice(0, 10);
}

/** Lê um arquivo OFX/QFX (formato dos extratos de banco) extraindo transações. */
export function parseOFX(content: string): ParsedTxn[] {
  const txns: ParsedTxn[] = [];
  const blocks = content.split(/<STMTTRN>/i).slice(1);
  for (const block of blocks) {
    const amount = tag(block, "TRNAMT");
    const date = tag(block, "DTPOSTED");
    const name = tag(block, "NAME") || tag(block, "MEMO") || "Lançamento";
    if (amount == null) continue;
    txns.push({
      date: ofxDate(date ?? ""),
      description: name.trim(),
      amount: parseFloat(amount.replace(",", ".")),
    });
  }
  return txns;
}

function tag(block: string, name: string): string | null {
  // OFX permite tags sem fechamento: <NAME>valor (até a próxima tag ou quebra).
  const re = new RegExp(`<${name}>([^<\r\n]*)`, "i");
  const m = block.match(re);
  return m ? m[1] : null;
}

/**
 * Lê um CSV genérico de extrato. Tenta detectar colunas de data, descrição e
 * valor pelos nomes do cabeçalho. Retorna [] se não achar colunas plausíveis.
 */
export function parseCSV(content: string): ParsedTxn[] {
  const { data } = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  if (!data.length) return [];

  const cols = Object.keys(data[0]);
  const dateCol = cols.find((c) => /data|date/i.test(c));
  const descCol = cols.find((c) => /desc|histó|histo|lan|memo|name/i.test(c));
  const valCol = cols.find((c) => /valor|amount|value|montante/i.test(c));
  if (!dateCol || !valCol) return [];

  const txns: ParsedTxn[] = [];
  for (const row of data) {
    const amount = parseFloat(String(row[valCol]).replace(/\./g, "").replace(",", "."));
    if (isNaN(amount)) continue;
    txns.push({
      date: normalizeDate(row[dateCol]),
      description: (descCol ? row[descCol] : "Lançamento")?.trim() || "Lançamento",
      amount,
    });
  }
  return txns;
}

/** Aceita DD/MM/AAAA ou AAAA-MM-DD e devolve AAAA-MM-DD. */
function normalizeDate(raw: string): string {
  const s = (raw ?? "").trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return s.slice(0, 10);
}
