export type PoetCourseStoryContent = {
  happensTitle: string;
  happensLead: string;
  skillGroups: Array<{ title: string; items: string[] }>;
  playTitle: string;
  playBody: string;
  playPull: string;
  classTitle: string;
  classLead: string;
  classSteps: Array<{ title: string; body: string }>;
  closeTitle: string;
  closeBody: string[];
};

export function PoetCourseStory({ story }: { story: PoetCourseStoryContent }) {
  return (
    <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
      <section aria-labelledby="course-happens-heading">
        <h2 id="course-happens-heading" className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">
          {story.happensTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">{story.happensLead}</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {story.skillGroups.map((group) => (
            <li key={group.title} className="rounded-2xl border border-poet-gold/15 bg-black/25 px-4 py-4 sm:px-5">
              <h3 className="text-sm font-semibold text-poet-gold-bright">{group.title}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span className="mt-[0.65em] h-1 w-1 shrink-0 rounded-full bg-poet-gold" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-poet-gold/20 bg-gradient-to-br from-poet-gold/[0.07] via-black/20 to-black/35 px-5 py-6 sm:px-7 sm:py-8"
        aria-labelledby="course-play-heading"
      >
        <h2 id="course-play-heading" className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">
          {story.playTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300 sm:text-base">{story.playBody}</p>
        <p className="mt-5 font-display text-lg font-medium leading-snug text-gradient-gold sm:text-xl">
          {story.playPull}
        </p>
      </section>

      <section aria-labelledby="course-class-heading">
        <h2 id="course-class-heading" className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">
          {story.classTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">{story.classLead}</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {story.classSteps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-poet-gold/15 bg-poet-surface/20 px-4 py-4 sm:px-5"
            >
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-poet-gold/20 text-xs font-bold text-poet-gold-bright">
                {index + 1}
              </p>
              <h3 className="mt-3 text-sm font-semibold text-zinc-100 sm:text-base">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="rounded-2xl border border-poet-gold/15 bg-black/25 px-5 py-6 sm:px-7"
        aria-labelledby="course-close-heading"
      >
        <h2 id="course-close-heading" className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">
          {story.closeTitle}
        </h2>
        {story.closeBody.map((paragraph) => (
          <p key={paragraph} className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {paragraph}
          </p>
        ))}
      </section>
    </div>
  );
}
