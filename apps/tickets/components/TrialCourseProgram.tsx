export type TrialCourseProgramContent = {
  title: string;
  lead: string;
  lessons: string;
  stages: Array<{
    range: string;
    title: string;
    topics: string[];
  }>;
  price: string;
  schedule: string;
  group: string;
  start: string;
  venue: string;
};

export function TrialCourseProgram({
  program,
  bookingHref,
  bookingLabel,
  trialPriceLabel,
  trialPrice,
}: {
  program: TrialCourseProgramContent;
  bookingHref: string;
  bookingLabel: string;
  trialPriceLabel: string;
  trialPrice: string | null;
}) {
  return (
    <section
      className="relative mt-10 overflow-hidden rounded-3xl border border-poet-gold/25 bg-gradient-to-br from-poet-surface/80 via-poet-surface/35 to-black/40 px-5 py-7 shadow-gold sm:px-8 sm:py-9"
      aria-labelledby="trial-course-program-heading"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-poet-gold/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-poet-gold/75">{program.lessons}</p>
          <h2
            id="trial-course-program-heading"
            className="mt-3 font-display text-2xl font-semibold text-gradient-gold sm:text-3xl"
          >
            {program.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">{program.lead}</p>
        </div>
        {trialPrice ? (
          <div className="rounded-2xl border border-poet-gold/30 bg-black/35 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{trialPriceLabel}</p>
            <p className="mt-1 text-xl font-semibold text-poet-gold-bright">{trialPrice}</p>
          </div>
        ) : null}
      </div>

      <ol className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {program.stages.map((stage, index) => (
          <li
            key={`${stage.range}-${stage.title}`}
            className="group/stage rounded-2xl border border-poet-gold/15 bg-black/25 p-4 transition hover:border-poet-gold/35 hover:bg-black/35 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-poet-gold/25 bg-poet-gold/[0.07] px-2 text-[10px] font-bold tracking-[0.12em] text-poet-gold-bright">
                {stage.range}
              </span>
              <span className="text-[10px] font-medium text-zinc-600">0{index + 1}</span>
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-100">{stage.title}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
              {stage.topics.map((topic) => (
                <li key={topic} className="flex gap-2.5">
                  <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-poet-gold" aria-hidden />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="relative mt-6 grid gap-3 rounded-2xl border border-poet-gold/20 bg-black/30 p-4 text-sm leading-relaxed text-zinc-300 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <p className="font-semibold text-poet-gold-bright">{program.price}</p>
        <p>{program.schedule}</p>
        <p>{program.group}</p>
        <p>{program.start}</p>
        <p className="sm:col-span-2">{program.venue}</p>
      </div>

      <a
        href={bookingHref}
        className="btn-poet btn-poet-theatre relative mt-6 inline-flex min-h-12 w-full items-center justify-center px-6 py-3 text-center text-sm font-semibold no-underline sm:w-auto"
      >
        {bookingLabel}
      </a>
    </section>
  );
}
