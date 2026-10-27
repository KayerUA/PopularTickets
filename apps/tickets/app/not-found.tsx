import type { Metadata } from "next";
import Link from "next/link";
import { getRequestAppLocale } from "@/lib/requestLocale";
import { notFoundCopy } from "@/lib/notFoundMetadata";

export const metadata: Metadata = { title: { absolute: "Страница не найдена · PopularTickets" }, robots: { index: false, follow: true } };
export default async function NotFound() {
  const locale = await getRequestAppLocale();
  const t = notFoundCopy[locale];
  return <div className="mx-auto max-w-3xl px-5 py-16 text-zinc-100"><h1 className="font-display text-3xl">{t.title}</h1><p className="mt-4 text-zinc-300">{t.body}</p><nav className="mt-6 flex flex-wrap gap-5"><Link className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href={`/${locale}/events`}>{t.events}</Link><a className="inline-flex min-h-11 items-center text-poet-gold-bright underline" href={`https://www.popularpoet.pl/${locale}`}>{t.courses}</a></nav></div>;
}
