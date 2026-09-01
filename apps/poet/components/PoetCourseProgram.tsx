export type PoetCourseProgramContent = {
  title: string;
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
  trial: string;
  bookingCta: string;
};

export function PoetCourseProgram({
  program,
  bookingHref,
}: {
  program: PoetCourseProgramContent;
  bookingHref: string;
}) {
  return (
    <section className="mt-8 border-t border-poet-gold/15 pt-7" aria-labelledby="course-program-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="course-program-heading" className="font-display text-2xl font-medium text-zinc-100 sm:text-3xl">
          {program.title}
        </h2>
        <span className="rounded-full border border-poet-gold/25 bg-poet-gold/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-poet-gold-bright">
          {program.lessons}
        </span>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {program.stages.map((stage) => (
          <li
            key={`${stage.range}-${stage.title}`}
            className="rounded-xl border border-poet-gold/15 bg-black/25 px-4 py-4 sm:px-5"
          >
            <div className="flex items-baseline gap-3">
              <span className="shrink-0 text-xs font-bold tracking-[0.12em] text-poet-gold">{stage.range}</span>
              <h3 className="text-sm font-semibold text-zinc-100 sm:text-base">{stage.title}</h3>
            </div>
            <ul className="mt-3 space-y-1.5 pl-4 text-sm leading-relaxed text-zinc-400">
              {stage.topics.map((topic) => (
                <li key={topic} className="list-disc marker:text-poet-gold/70">
                  {topic}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-3 rounded-xl border border-poet-gold/20 bg-poet-gold/[0.04] p-4 text-sm leading-relaxed text-zinc-300 sm:grid-cols-2 sm:p-5">
        <p className="font-semibold text-poet-gold-bright">{program.price}</p>
        <p>{program.schedule}</p>
        <p>{program.group}</p>
        <p>{program.start}</p>
        <p>{program.venue}</p>
        <p className="font-semibold text-zinc-100">{program.trial}</p>
      </div>

      <a
        href={bookingHref}
        className="btn-poet btn-poet-theatre mt-5 inline-flex min-h-11 items-center justify-center px-6 py-2.5 text-sm font-semibold"
      >
        {program.bookingCta}
      </a>
    </section>
  );
}
