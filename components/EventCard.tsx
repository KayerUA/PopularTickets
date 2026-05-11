"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { formatPlnFromGrosze, formatEventDateTime } from "@/lib/format";
import type { AppLocale } from "@/i18n/routing";

export type EventCardProps = {
  slug: string;
  title: string;
  venue: string;
  startsAt: string;
  priceGrosze: number;
  imageUrl: string | null;
  locale: AppLocale;
};

export function EventCard(e: EventCardProps) {
  const t = useTranslations("EventCard");
  const href = `/events/${e.slug}`;
  const label = `${e.title} — ${t("buy")}`;

  return (
    <Link
      href={href}
      aria-label={label}
      className="group block h-full rounded-2xl no-underline outline-none transition duration-500 ease-out focus-visible:ring-2 focus-visible:ring-poet-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--poet-bg)]"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/55 shadow-gold-sm backdrop-blur-sm transition duration-500 ease-out group-hover:-translate-y-0.5 group-hover:border-poet-gold/45 group-hover:shadow-gold sm:group-hover:-translate-y-1">
        <div className="relative aspect-[16/10] w-full bg-zinc-950 sm:aspect-[16/9]">
          {e.imageUrl ? (
            <Image
              src={e.imageUrl}
              alt=""
              fill
              className="object-cover opacity-90 transition duration-700 group-hover:scale-[1.02] group-hover:opacity-100 sm:group-hover:scale-[1.03]"
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-poet-gold-dim/35 via-poet-bg to-zinc-950" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-poet-bg/80 via-transparent to-transparent opacity-60" />
        </div>
        <div className="flex flex-1 flex-col space-y-2 p-4 text-zinc-100 sm:p-5">
          <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-zinc-50 transition [overflow-wrap:anywhere] group-hover:text-poet-gold-bright sm:text-xl">
            {e.title}
          </h2>
          <p className="text-sm text-zinc-500">{formatEventDateTime(e.startsAt, e.locale)}</p>
          <p className="line-clamp-2 text-sm text-zinc-500 [overflow-wrap:anywhere]">{e.venue}</p>
          <div className="mt-auto flex flex-col gap-3 border-t border-poet-gold/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-lg font-medium text-poet-gold-bright sm:text-base">{formatPlnFromGrosze(e.priceGrosze)}</span>
            <span className="btn-poet poet-shine w-full justify-center px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wide sm:w-auto sm:py-2">
              {t("buy")}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
