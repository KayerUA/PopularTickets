import type { AppLocale } from "@/i18n/routing";

export type WalletButtonLabels = {
  apple: string;
  google: string;
};

export function walletButtonLabels(locale: AppLocale): WalletButtonLabels {
  if (locale === "pl") return { apple: "Dodaj do Apple Wallet", google: "Dodaj do Google Wallet" };
  if (locale === "uk") return { apple: "Додати до Apple Wallet", google: "Додати до Google Wallet" };
  return { apple: "Добавить в Apple Wallet", google: "Добавить в Google Wallet" };
}
