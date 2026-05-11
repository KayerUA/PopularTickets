import fs from "node:fs";
import path from "node:path";

/**
 * Встроенные @font-face для SVG→PNG (Sharp/librsvg): системные алиасы вроде ui-sans-serif
 * на Linux/Vercel не дают кириллицу — подключаем Noto Sans из @fontsource/noto-sans (WOFF2 в base64).
 */
const NOTO_FILES = path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files");

const FACES: readonly { weight: number; file: string; unicodeRange: string }[] = [
  {
    weight: 400,
    file: "noto-sans-latin-400-normal.woff2",
    unicodeRange:
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  },
  {
    weight: 400,
    file: "noto-sans-latin-ext-400-normal.woff2",
    unicodeRange:
      "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  },
  {
    weight: 400,
    file: "noto-sans-cyrillic-ext-400-normal.woff2",
    unicodeRange: "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F",
  },
  {
    weight: 400,
    file: "noto-sans-cyrillic-400-normal.woff2",
    unicodeRange: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
  },
  {
    weight: 600,
    file: "noto-sans-latin-600-normal.woff2",
    unicodeRange:
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  },
  {
    weight: 600,
    file: "noto-sans-latin-ext-600-normal.woff2",
    unicodeRange:
      "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  },
  {
    weight: 600,
    file: "noto-sans-cyrillic-ext-600-normal.woff2",
    unicodeRange: "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F",
  },
  {
    weight: 600,
    file: "noto-sans-cyrillic-600-normal.woff2",
    unicodeRange: "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
  },
];

/** `null` — ещё не вычисляли; строка — готовый блок (в т.ч. пустой fallback при ошибке чтения файлов). */
let cachedStyleBlock: string | null = null;

const EMPTY_STYLE = `<style type="text/css"><![CDATA[]]></style>`;

/** Фрагмент SVG: `<style>` с @font-face (вставить внутрь `<defs>`). */
export function getTicketSvgEmbeddedFontStyle(): string {
  if (cachedStyleBlock !== null) return cachedStyleBlock;

  try {
    const rules = FACES.map(({ weight, file, unicodeRange }) => {
      const full = path.join(NOTO_FILES, file);
      const buf = fs.readFileSync(full);
      const b64 = buf.toString("base64");
      return `@font-face{font-family:'Noto Sans';font-style:normal;font-weight:${weight};font-display:block;src:url('data:font/woff2;base64,${b64}') format('woff2');unicode-range:${unicodeRange};}`;
    });

    cachedStyleBlock = `<style type="text/css"><![CDATA[\n${rules.join("\n")}\n]]></style>`;
  } catch (err) {
    console.warn("[ticketPngFontFaces] не удалось прочитать WOFF2 Noto Sans (проверьте outputFileTracingIncludes):", err);
    cachedStyleBlock = EMPTY_STYLE;
  }
  return cachedStyleBlock;
}
