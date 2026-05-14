/** MVP: оплата без Przelewy24 — сразу «оплачено», билеты; письмо при Resend и без SKIP_ORDER_EMAIL. */
export function isCheckoutBypassPayment(): boolean {
  return process.env.CHECKOUT_BYPASS_PAYMENT === "true";
}
