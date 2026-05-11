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

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/55 shadow-gold-sm backdrop-blur-sm transition duration-500 ease-out hover:-translate-y-0.5 hover:border-poet-gold/45 hover:shadow-gold sm:hover:-translate-y-1">
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
      <div className="flex flex-1 flex-col space-y-2 p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-zinc-50 transition [overflow-wrap:anywhere] group-hover:text-poet-gold-bright sm:text-xl">
          {e.title}
        </h2>
        <p className="text-sm text-zinc-500">{formatEventDateTime(e.startsAt, e.locale)}</p>
        <p className="line-clamp-2 text-sm text-zinc-500 [overflow-wrap:anywhere]">{e.venue}</p>
        <div className="mt-auto flex flex-col gap-3 border-t border-poet-gold/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-lg font-medium text-poet-gold-bright sm:text-base">{formatPlnFromGrosze(e.priceGrosze)}</span>
          <Link
            href={`/events/${e.slug}`}
            className="btn-poet poet-shine w-full justify-center px-5 py-2.5 text-xs font-semibold uppercase tracking-wide sm:w-auto sm:py-2"
          >
            {t("buy")}
          </Link>
        </div>
      </div>
    </article>
  );
}
