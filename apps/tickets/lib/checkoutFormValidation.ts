export type CheckoutFieldKey = "buyerName" | "email" | "phone" | "quantity" | "acceptLegal";

export type CheckoutValidationMessages = {
  nameRequired: string;
  emailInvalid: string;
  phoneRequired: string;
  phoneInvalid: string;
  quantityInvalid: string;
  legalRequired: string;
};

export function validateCheckoutFormData(
  formData: FormData,
  maxQuantity: number,
  messages: CheckoutValidationMessages,
  options: { phoneRequired?: boolean } = {},
): Partial<Record<CheckoutFieldKey, string>> {
  const errors: Partial<Record<CheckoutFieldKey, string>> = {};

  const name = String(formData.get("buyerName") ?? "").trim();
  if (name.length < 2) errors.buyerName = messages.nameRequired;

  const email = String(formData.get("email") ?? "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = messages.emailInvalid;
  }

  const phone = String(formData.get("phone") ?? "").trim();
  if (options.phoneRequired !== false && !phone) {
    errors.phone = messages.phoneRequired;
  } else if (phone && phone.replace(/\D/g, "").length < 7) {
    errors.phone = messages.phoneInvalid;
  }

  const qtyRaw = formData.get("quantity");
  const qty = typeof qtyRaw === "string" ? Number(qtyRaw) : Number(qtyRaw);
  if (!Number.isFinite(qty) || qty < 1 || qty > maxQuantity || !Number.isInteger(qty)) {
    errors.quantity = messages.quantityInvalid;
  }

  if (formData.get("acceptLegal") !== "on") {
    errors.acceptLegal = messages.legalRequired;
  }

  return errors;
}

export function firstCheckoutFieldError(
  errors: Partial<Record<CheckoutFieldKey, string>>,
): CheckoutFieldKey | null {
  const order: CheckoutFieldKey[] = ["buyerName", "email", "phone", "quantity", "acceptLegal"];
  for (const key of order) {
    if (errors[key]) return key;
  }
  return null;
}
