import Image from "next/image";
import Link from "next/link";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";

export function PoetHeader() {
  const tickets = getTicketsSiteBase();

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-poet-gold/15 bg-poet-bg/80 pt-[max(0px,env(safe-area-inset-top,0px))] backdrop-blur-md supports-[backdrop-filter]:bg-poet-bg/75">
      <div className="poet-safe-x mx-auto flex max-w-5xl flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link href="/" className="group flex min-w-0 max-w-[min(100%,22rem)] items-center gap-2.5 no-underline text-inherit sm:gap-3">
          <div className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
            <div className="animate-float-slow absolute inset-0">
              <Image
                src="/brand/popular-poet-logo.png"
                alt="Popular Poet"
                fill
                className="object-contain drop-shadow-[0_0_14px_rgba(197,160,89,0.45)]"
                sizes="44px"
                priority
              />
            </div>
          </div>
          <div className="min-w-0 leading-tight">
            <span className="font-display block truncate text-base tracking-wide text-gradient-gold sm:text-lg">Popular Poet</span>
            <span className="block text-[9px] font-medium uppercase tracking-[0.22em] text-zinc-400 sm:text-[10px] sm:tracking-[0.28em]">
              Warszawa · teatr · kursy
            </span>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-1">
          <Link
            href="/#kursy"
            className="inline-flex min-h-11 min-w-[2.75rem] items-center justify-center rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright sm:min-w-0"
          >
            Kursy
          </Link>
          <Link
            href="/#proby"
            className="inline-flex min-h-11 min-w-[2.75rem] items-center justify-center rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright sm:min-w-0"
          >
            Próby
          </Link>
          {tickets ? (
            <>
              <a
                href={ticketsHome("pl")}
                className="inline-flex min-h-11 min-w-[2.75rem] items-center justify-center rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright sm:min-w-0"
              >
                Bilety
              </a>
              <a
                href={`${tickets}/pl/firma`}
                className="inline-flex min-h-11 min-w-[2.75rem] items-center justify-center rounded-xl px-3 text-sm text-zinc-300 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright sm:min-w-0"
              >
                Dane sprzedawcy
              </a>
            </>
          ) : (
            <span className="px-2 text-[11px] text-amber-200/80">Ustaw NEXT_PUBLIC_TICKETS_SITE_URL</span>
          )}
        </nav>
      </div>
    </header>
  );
}
