/**
 * Klient REST Przelewy24 v1: `transaction/register`, `transaction/verify`, podpis SHA-384 (CRC).
 * Dokumentacja: https://developers.przelewy24.pl/index.php?pl#tag/Transaction-service-API
 * Sandbox / produkcja: `P24_SANDBOX`, hosty w `getP24BaseUrl` / `getP24TrnUrl`.
 * Aplikacje mobilne (natywne biblioteki): przykład React Native archiwum
 * https://github.com/przelewy24/p24-mobile-lib-react-native-example — ten serwis używa przekierowania web (trnRequest).
 */
import crypto from "crypto";

function sha384Hex(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return crypto.createHash("sha384").update(json, "utf8").digest("hex");
}

function getCrc(): string {
  const crc = process.env.P24_CRC_KEY;
  if (!crc) throw new Error("P24_CRC_KEY не задан");
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
  const sandbox = process.env.P24_SANDBOX === "true";
  return sandbox
    ? "https://sandbox.przelewy24.pl/api/v1"
    : "https://secure.przelewy24.pl/api/v1";
}

export function getP24TrnUrl(token: string): string {
  const sandbox = process.env.P24_SANDBOX === "true";
  const host = sandbox ? "https://sandbox.przelewy24.pl" : "https://secure.przelewy24.pl";
  return `${host}/trnRequest/${token}`;
}

export function p24BasicAuthHeader(): string {
  const posId = process.env.P24_POS_ID;
  const secretId = process.env.P24_SECRET_ID;
  if (!posId || !secretId) throw new Error("P24_POS_ID и P24_SECRET_ID обязательны");
  const token = Buffer.from(`${posId}:${secretId}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function getMerchantId(): number {
  const v = process.env.P24_MERCHANT_ID;
  if (!v) throw new Error("P24_MERCHANT_ID не задан");
  return Number(v);
}

export function getPosId(): number {
  const v = process.env.P24_POS_ID;
  if (!v) throw new Error("P24_POS_ID не задан");
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
