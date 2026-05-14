/**
 * Сверяет подписи PDF для uk/ru: messages/*.json → TicketPdf и lib/email/ticketEmailI18n.ts → emailTicketPdfLayoutStrings.
 * При расхождении exit 1 (удобно для CI / перед релизом).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const ticketsApp = path.join(repoRoot, "apps", "tickets");

const TS_PATH = path.join(ticketsApp, "lib/email/ticketEmailI18n.ts");

/** Ключ в JSON TicketPdf → поле в объекте L[locale] в TS */
const PAIRS = [
  ["kindSecondary", "ticketKindSecondary"],
  ["qrSecondary", "ticketQrSecondary"],
  ["translationDisclaimer", "ticketDisclaimer"],
  ["ticketNumberCaption", "ticketNumberCaption"],
];

function readJsonTicketPdf(locale) {
  const raw = fs.readFileSync(path.join(ticketsApp, `messages/${locale}.json`), "utf8");
  const data = JSON.parse(raw);
  const tp = data.TicketPdf;
  if (!tp) throw new Error(`messages/${locale}.json: нет секции TicketPdf`);
  return tp;
}

function extractTsBlock(ts, locale) {
  const open = `    ${locale}: {`;
  const i = ts.indexOf(open);
  if (i === -1) throw new Error(`${TS_PATH}: не найден блок ${locale}`);
  const from = i + open.length;
  const close =
    locale === "uk"
      ? "\n    ru:"
      : locale === "ru"
        ? "\n    },\n  };"
        : null;
  if (!close) throw new Error("locale");
  const j = ts.indexOf(close, from);
  if (j === -1) throw new Error(`${TS_PATH}: не закрыт блок ${locale}`);
  return ts.slice(from, j);
}

function readTsField(block, tsKey) {
  const re = new RegExp(`${tsKey}:\\s*"((?:\\\\.|[^"\\\\])*)"`, "m");
  const m = block.match(re);
  if (!m) throw new Error(`В блоке emailTicketPdfLayoutStrings нет поля ${tsKey}`);
  return JSON.parse(`"${m[1].replace(/\\"/g, '"')}"`);
}

function main() {
  const ts = fs.readFileSync(TS_PATH, "utf8");
  let errors = 0;

  for (const locale of ["uk", "ru"]) {
    const jsonTp = readJsonTicketPdf(locale);
    const block = extractTsBlock(ts, locale);
    for (const [jsonKey, tsKey] of PAIRS) {
      const fromJson = jsonTp[jsonKey] ?? "";
      const fromTs = readTsField(block, tsKey);
      if (fromJson !== fromTs) {
        console.error(`[${locale}] расхождение ${jsonKey} (messages) ≠ ${tsKey} (TS)`);
        console.error(`  messages: ${JSON.stringify(fromJson)}`);
        console.error(`  TS:       ${JSON.stringify(fromTs)}`);
        errors++;
      }
    }
  }

  if (errors) {
    console.error(`\nВсего расхождений: ${errors}. Обновите оба места одинаково.`);
    process.exit(1);
  }
  console.log("check-ticket-pdf-i18n: uk/ru TicketPdf и ticketEmailI18n совпадают.");
}

main();
