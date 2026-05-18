/**
 * Klient REST Przelewy24 v1: `transaction/register`, `transaction/verify`, podpis SHA-384 (CRC).
 * Dokumentacja: https://developers.przelewy24.pl/index.php?pl#tag/Transaction-service-API
 * Sandbox / produkcja: `P24_SANDBOX`, hosty w `getP24BaseUrl` / `getP24TrnUrl`.
 *
 * Credentials (REST v1, Basic Auth na register/verify) — jak w oficjalnym kliencie PHP P24
 * (dominservice/przelewy24-php, `src/Api/Api.php`: Guzzle `AUTH` = `[posId(), reportsKey()]`):
 * - **Login Basic** = **POS ID** (jeśli brak w env — ten sam numer co merchantId z panelu).
 * - **Hasło Basic** = **„Klucz do raportów”** (`reportsKey`) — NIE „Klucz do zamówień”, NIE CRC.
 * - **CRC** — osobno, tylko do pola `sign` w JSON (SHA-384).
 * - Produkcja: `P24_MERCHANT_ID`, `P24_POS_ID`, `P24_CRC_KEY` + klucz API jako `P24_REPORTS_SECRET_ID` lub `P24_SECRET_ID`
 *   (jeśli trzymasz raportowy klucz w `P24_SECRET_ID` — zostaw; sensowniej nazwać `P24_REPORTS_SECRET_ID`).
 * - Sandbox: `P24_SANDBOX` = true/1/on/yes (lub gdy **brak** `P24_SANDBOX`, ale są `SANDBOX_P24_REPORTS_*` + merchant/POS
 *   i **brak** `P24_MERCHANT_ID` — wtedy traktujemy jak sandbox, żeby Vercel nie wymagał duplikatu `P24_MERCHANT_ID`).
 *   Jawne `P24_SANDBOX=false` / 0 / off — zawsze produkcja.
 *
 * Aplikacje mobilne (natywne biblioteki): przykład React Native archiwum
 * https://github.com/przelewy24/p24-mobile-lib-react-native-example — ten serwis używa przekierowania web (trnRequest).
 */
import crypto from "crypto";

function envNonEmpty(key: string): string | undefined {
  const raw = process.env[key];
  if (raw === undefined || raw === null) return undefined;
  const t = String(raw).trim();
  return t === "" ? undefined : t;
}

/**
 * Tryb sandbox API (host + klucze SANDBOX_P24_*).
 * Gdy `P24_SANDBOX` jest pusty/nieobecny, ale w Vercel są tylko zmienne SANDBOX_* bez `P24_MERCHANT_ID` — uznajemy sandbox
 * (typowy błąd: same SANDBOX_P24_MERCHANT_ID a flaga nie dotarła do runtime / zła wartość).
 */
export function p24SandboxMode(): boolean {
  const raw = envNonEmpty("P24_SANDBOX");
  if (raw !== undefined) {
    const v = raw.toLowerCase();
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
    // Np. "sandbox" — nieznane; wnioskujemy z SANDBOX_P24_* poniżej
  }
  const sandboxSecret =
    envNonEmpty("SANDBOX_P24_REPORTS_SECRET_ID") ??
    envNonEmpty("SANDBOX_P24_API_KEY") ??
    envNonEmpty("SANDBOX_P24_TRANSACTION_SECRET_ID") ??
    envNonEmpty("SANDBOX_P24_SECRET_ID");
  const sandboxId =
    envNonEmpty("SANDBOX_P24_MERCHANT_ID") ??
    envNonEmpty("SANDBOX_P24_POS_ID");
  const prodMerchant = envNonEmpty("P24_MERCHANT_ID");
  if (sandboxSecret && sandboxId && !prodMerchant) return true;
  return false;
}

/** Usuwa przypadkowe cudzysłowy z Vercel / .env (np. `"secret"`). */
function stripEnvQuotes(raw: string): string {
  const t = raw.trim();
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

/** Jak w plikach .env: `397771 # komentarz` → `397771` (poza pełnym cudzysłowem). */
function stripTrailingUnquotedHashComment(raw: string): string {
  const t = raw.trim();
  const quoted = (t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"));
  if (quoted) return t;
  return t.replace(/\s+#.*$/, "").trim();
}

function firstEnvTrimmed(...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const v = stripEnvQuotes(stripTrailingUnquotedHashComment(raw));
    if (v) return v;
  }
  return undefined;
}

/** Merchant ID (konto) — w sandboxie preferuj SANDBOX_P24_MERCHANT_ID. */
function resolveP24MerchantIdRaw(): string | undefined {
  if (p24SandboxMode()) {
    return firstEnvTrimmed("SANDBOX_P24_MERCHANT_ID", "P24_MERCHANT_ID");
  }
  return firstEnvTrimmed("P24_MERCHANT_ID");
}

/** Login do Basic Auth (REST) = POS ID — zgodnie z klientem `Przelewy24\Api\Api` (AUTH[0] = posId). */
function resolveP24BasicAuthLoginRaw(): string | undefined {
  return resolveP24PosIdRaw();
}

/** POS ID — w sandboxie często = merchant; jeśli brak, bierzemy merchant. */
function resolveP24PosIdRaw(): string | undefined {
  if (p24SandboxMode()) {
    return firstEnvTrimmed(
      "SANDBOX_P24_POS_ID",
      "P24_POS_ID",
      "SANDBOX_P24_MERCHANT_ID",
      "P24_MERCHANT_ID"
    );
  }
  return firstEnvTrimmed("P24_POS_ID", "P24_MERCHANT_ID");
}

/** Hasło do Basic Auth (REST): w panelu P24 to zwykle „Klucz do raportów” / klucz API — nie „do zamówień”. */
function resolveP24BasicAuthSecretRaw(): string | undefined {
  if (p24SandboxMode()) {
    // Najpierw jawna nazwa „raportów” — unikamy sytuacji, gdy SANDBOX_P24_API_KEY wskazuje zły skrócony klucz.
    return firstEnvTrimmed(
      "SANDBOX_P24_REPORTS_SECRET_ID",
      "SANDBOX_P24_API_KEY",
      "SANDBOX_P24_TRANSACTION_SECRET_ID",
      "SANDBOX_P24_SECRET_ID",
      "P24_REPORTS_SECRET_ID",
      "P24_API_KEY",
      "P24_TRANSACTION_SECRET_ID",
      "P24_SECRET_ID"
    );
  }
  return firstEnvTrimmed(
    "P24_REPORTS_SECRET_ID",
    "P24_API_KEY",
    "P24_TRANSACTION_SECRET_ID",
    "P24_SECRET_ID"
  );
}

function resolveP24CrcRaw(): string | undefined {
  if (p24SandboxMode()) {
    return firstEnvTrimmed("SANDBOX_P24_CRC_KEY", "P24_CRC_KEY");
  }
  return firstEnvTrimmed("P24_CRC_KEY");
}

function sha384Hex(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return crypto.createHash("sha384").update(json, "utf8").digest("hex");
}

function getCrc(): string {
  const crc = resolveP24CrcRaw();
  if (!crc) {
    throw new Error(
      p24SandboxMode()
        ? "Brak CRC: ustaw SANDBOX_P24_CRC_KEY lub P24_CRC_KEY"
        : "P24_CRC_KEY не задан"
    );
  }
  return crc;
}

export function signRegister(params: {
  sessionId: string;
  merchantId: number;
  amount: number;
  currency: string;
}): string {
  return sha384Hex({
    sessionId: params.sessionId,
    merchantId: params.merchantId,
    amount: params.amount,
    currency: params.currency,
    crc: getCrc(),
  });
}

export function signVerify(params: {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: string;
}): string {
  return sha384Hex({
    sessionId: params.sessionId,
    orderId: params.orderId,
    amount: params.amount,
    currency: params.currency,
    crc: getCrc(),
  });
}

/** Подпись уведомления urlStatus (успешная оплата) */
export function signNotification(body: {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
}): string {
  return sha384Hex({
    merchantId: body.merchantId,
    posId: body.posId,
    sessionId: body.sessionId,
    amount: body.amount,
    originAmount: body.originAmount,
    currency: body.currency,
    orderId: body.orderId,
    methodId: body.methodId,
    statement: body.statement,
    crc: getCrc(),
  });
}

export function getP24BaseUrl(): string {
  return p24SandboxMode()
    ? "https://sandbox.przelewy24.pl/api/v1"
    : "https://secure.przelewy24.pl/api/v1";
}

export function getP24TrnUrl(token: string): string {
  const host = p24SandboxMode() ? "https://sandbox.przelewy24.pl" : "https://secure.przelewy24.pl";
  return `${host}/trnRequest/${token}`;
}

function buildP24BasicAuthorization(login: string, secret: string): string {
  const token = Buffer.from(`${login}:${secret}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function p24BasicAuthHeader(): string {
  const login = resolveP24BasicAuthLoginRaw();
  const secretId = resolveP24BasicAuthSecretRaw();
  if (!login || !secretId) {
    throw new Error(
      p24SandboxMode()
        ? "Brak POS lub klucza do raportów: SANDBOX_P24_POS_ID (lub merchant jako POS), SANDBOX_P24_REPORTS_SECRET_ID"
        : "P24_POS_ID (или P24_MERCHANT_ID) и P24_REPORTS_SECRET_ID обязательны"
    );
  }
  return buildP24BasicAuthorization(login, secretId);
}

export function getMerchantId(): number {
  const v = resolveP24MerchantIdRaw();
  if (!v) {
    if (!p24SandboxMode() && firstEnvTrimmed("SANDBOX_P24_MERCHANT_ID")) {
      throw new Error(
        "P24_MERCHANT_ID не задан, но задан SANDBOX_P24_MERCHANT_ID. Установите P24_SANDBOX=true или оставьте только SANDBOX_* без пустого P24_MERCHANT_ID."
      );
    }
    throw new Error(
      p24SandboxMode() ? "Brak SANDBOX_P24_MERCHANT_ID lub P24_MERCHANT_ID" : "P24_MERCHANT_ID не задан"
    );
  }
  return Number(v);
}

export function getPosId(): number {
  const v = resolveP24PosIdRaw();
  if (!v) {
    throw new Error(
      p24SandboxMode()
        ? "Brak POS: SANDBOX_P24_POS_ID albo SANDBOX_P24_MERCHANT_ID / P24_*"
        : "P24_POS_ID не задан"
    );
  }
  return Number(v);
}

export class P24RegisterAuthError extends Error {
  constructor() {
    super("P24_REGISTER_AUTH");
    this.name = "P24RegisterAuthError";
  }
}

export type P24RegisterResult = { token: string };

function isP24AuthFailure(res: Response, json: { code?: number; error?: string }): boolean {
  return (
    res.status === 401 ||
    json.code === 401 ||
    /incorrect authentication/i.test(String(json.error ?? ""))
  );
}

export async function p24Register(body: Record<string, unknown>): Promise<P24RegisterResult> {
  const authorization = p24BasicAuthHeader();
  const res = await fetch(`${getP24BaseUrl()}/transaction/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    data?: { token?: string };
    responseCode?: number;
    error?: string;
    code?: number;
  };
  if (isP24AuthFailure(res, json)) {
    throw new P24RegisterAuthError();
  }
  if (!res.ok || json.responseCode !== 0 || !json.data?.token) {
    throw new Error(`P24 register failed: ${JSON.stringify(json)}`);
  }
  return { token: json.data.token };
}

export async function p24Verify(payload: {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  currency: string;
  orderId: number;
  sign: string;
}): Promise<void> {
  const res = await fetch(`${getP24BaseUrl()}/transaction/verify`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: p24BasicAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { responseCode?: number; data?: { status?: string } };
  if (!res.ok || json.responseCode !== 0) {
    throw new Error(`P24 verify failed: ${JSON.stringify(json)}`);
  }
}
