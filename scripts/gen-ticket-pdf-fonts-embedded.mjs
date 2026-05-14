/**
 * Генерирует `apps/tickets/lib/ticketPdfFontsEmbedded.ts` из TTF в `lib/ticket-pdf-assets/`.
 * Запуск из корня репо: `node scripts/gen-ticket-pdf-fonts-embedded.mjs`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ticketsDir = path.join(root, "apps/tickets");
const assetsDir = path.join(ticketsDir, "lib/ticket-pdf-assets");
const outFile = path.join(ticketsDir, "lib/ticketPdfFontsEmbedded.ts");

const files = [
  { exportName: "DEJAVU_SANS_TTF", file: "DejaVuSans.ttf" },
  { exportName: "DEJAVU_SANS_BOLD_TTF", file: "DejaVuSans-Bold.ttf" },
];

function toChunkedBase64(buf) {
  const b64 = buf.toString("base64");
  const lineLen = 96;
  const parts = [];
  for (let i = 0; i < b64.length; i += lineLen) {
    parts.push(JSON.stringify(b64.slice(i, i + lineLen)));
  }
  return parts.join(",\n  ");
}

let body = `/* eslint-disable max-len -- сгенерировано scripts/gen-ticket-pdf-fonts-embedded.mjs */
import { Buffer } from "node:buffer";

`;

for (const { exportName, file } of files) {
  const p = path.join(assetsDir, file);
  if (!fs.existsSync(p)) {
    console.error("Нет файла:", p);
    process.exit(1);
  }
  const buf = fs.readFileSync(p);
  const chunks = toChunkedBase64(buf);
  body += `/** ${file} (${buf.length} bytes) */\nexport const ${exportName}: Buffer = Buffer.from(\n  [\n  ${chunks},\n  ].join(""),\n  "base64"\n);\n\n`;
}

fs.writeFileSync(outFile, body, "utf8");
console.log("OK →", path.relative(root, outFile));
