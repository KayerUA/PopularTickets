/** MVP: оплата без Przelewy24 — сразу «оплачено», билеты, письмо при наличии Resend. */
export function isCheckoutBypassPayment(): boolean {
  return process.env.CHECKOUT_BYPASS_PAYMENT === "true";
}
