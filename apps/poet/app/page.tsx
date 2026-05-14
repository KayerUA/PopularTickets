import { PoetMarquee } from "@/components/PoetMarquee";
import { getTicketsSiteBase, ticketsHome } from "@/lib/ticketsSite";

const COURSES = [
  {
    id: "improvisation",
    title: "Improwizacja aktorska",
    body: "Formaty sceniczne, reakcja „tu i teraz”, praca z publicznością i komedią — bez sztywnego scenariusza.",
  },
  {
    id: "acting",
    title: "Warsztaty aktorskie",
    body: "Technika głosu, praca z tekstem, emocja i obecność na scenie — od podstaw po zaawansowane ćwiczenia.",
  },
  {
    id: "playback",
    title: "Grupy PLAY-BACK",
    body: "Muzyka, ruch i opowieści widzów w jednym — zespół odtwarza historie na żywo na scenie.",
  },
] as const;

export default function HomePage() {
  const tickets = getTicketsSiteBase();

  return (
    <div className="poet-safe-x mx-auto max-w-5xl pb-12 pt-6 sm:pb-16 sm:pt-8">
      <PoetMarquee />

      <header className="animate-fade-up text-center sm:text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-poet-gold/80">Teatr Popular Poet</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-gradient-gold sm:text-4xl md:text-5xl">
          Kursy i przestrzeń dla widza
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:mx-0 sm:text-base">
          Ta strona to świat marki <strong className="text-zinc-200">Popular Poet</strong> — zapisów na warsztaty, kursy i informacji o zajęciach próbnych.
          Afisza biletowa i płatności są w serwisie{" "}
          {tickets ? (
            <a href={ticketsHome("pl")} className="font-medium">
              PopularTickets
            </a>
          ) : (
            <strong className="text-zinc-300">PopularTickets</strong>
          )}
          , żeby jedna ekosystemowa ścieżka: od odkrycia marki po zakup miejsca na wydarzenie.
        </p>
      </header>

      <section id="kursy" className="mt-14 scroll-mt-24 sm:mt-16">
        <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">Kursy</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">Treści i terminy zapisów — wkrótce podłączone do wspólnej bazy; poniżej stała oferta programowa.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {COURSES.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-5 shadow-gold-sm backdrop-blur-sm transition hover:border-poet-gold/35"
            >
              <h3 className="font-display text-lg font-medium text-gradient-gold">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{c.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="proby" className="mt-14 scroll-mt-24 sm:mt-16">
        <div className="rounded-2xl border border-poet-gold/25 bg-poet-surface/35 p-6 shadow-gold-sm backdrop-blur-sm sm:p-8">
          <h2 className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">Zajęcia próbne</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Próby bywają bezpłatne lub płatne — wtedy rezerwacja i płatność odbywają się jak przy zwykłym bilecie: przez{" "}
            {tickets ? (
              <a href={ticketsHome("pl")} className="font-medium">
                PopularTickets
              </a>
            ) : (
              "PopularTickets"
            )}
            , na wydarzeniu przypisanym do danego terminu (link pojawi się przy każdym slocie).
          </p>
          {tickets ? (
            <div className="mt-6">
              <a href={ticketsHome("pl")} className="btn-poet-theatre btn-poet inline-flex no-underline">
                Przejdź do afiszy i biletów
              </a>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
