/**
 * Klient REST Przelewy24 v1: `transaction/register`, `transaction/verify`, podpis SHA-384 (CRC).
 * Dokumentacja: https://developers.przelewy24.pl/index.php?pl#tag/Transaction-service-API
 * Sandbox / produkcja: `P24_SANDBOX`, hosty w `getP24BaseUrl` / `getP24TrnUrl`.
 *
 * Credentials:
 * - Produkcja: `P24_MERCHANT_ID`, `P24_POS_ID`, `P24_SECRET_ID`, `P24_CRC_KEY`.
 * - Sandbox (`P24_SANDBOX=true`): najpierw `SANDBOX_P24_*`, potem fallback na `P24_*`
 *   (żeby w jednym `.env` trzymać osobno klucze sandbox i produkcji).
 * - `SANDBOX_P24_REPORTS_SECRET_ID` — tylko dokumentacja w `.env`; REST checkout go nie używa
 *   (raporty to inny klucz w panelu P24).
 *
 * Aplikacje mobilne (natywne biblioteki): przykład React Native archiwum
 * https://github.com/przelewy24/p24-mobile-lib-react-native-example — ten serwis używa przekierowania web (trnRequest).
 */
import crypto from "crypto";

function p24SandboxMode(): boolean {
  return process.env.P24_SANDBOX === "true";
}

function firstEnvTrimmed(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
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

/** Secret do Basic Auth (klucz „do zamówień” / REST) — nie mylić z kluczem do raportów. */
function resolveP24SecretIdRaw(): string | undefined {
  if (p24SandboxMode()) {
    return firstEnvTrimmed(
      "SANDBOX_P24_TRANSACTION_SECRET_ID",
      "SANDBOX_P24_SECRET_ID",
      "P24_TRANSACTION_SECRET_ID",
      "P24_SECRET_ID"
    );
  }
  return firstEnvTrimmed("P24_TRANSACTION_SECRET_ID", "P24_SECRET_ID");
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

export function p24BasicAuthHeader(): string {
  const posId = resolveP24PosIdRaw();
  const secretId = resolveP24SecretIdRaw();
  if (!posId || !secretId) {
    throw new Error(
      p24SandboxMode()
        ? "Brak POS/secret: SANDBOX_P24_POS_ID (opcjonalnie) + SANDBOX_P24_SECRET_ID lub P24_*"
        : "P24_POS_ID и P24_SECRET_ID обязательны"
    );
  }
  const token = Buffer.from(`${posId}:${secretId}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function getMerchantId(): number {
  const v = resolveP24MerchantIdRaw();
  if (!v) {
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

export type P24RegisterResult = { token: string };

export async function p24Register(body: Record<string, unknown>): Promise<P24RegisterResult> {
  const res = await fetch(`${getP24BaseUrl()}/transaction/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: p24BasicAuthHeader(),
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    data?: { token?: string };
    responseCode?: number;
    error?: string;
  };
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
