import { Link } from "@/i18n/navigation";
import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import type { PoetCourseProgramContent } from "@/components/PoetCourseProgram";
import type { PoetCourseCardVariant } from "@/lib/poetStaticCourses";

type Props = {
  courseHref: string;
  bookingHref: string;
  image: string;
  title: string;
  description: string;
  tagLine: string;
  variant: PoetCourseCardVariant;
  unoptimized?: boolean;
  program: PoetCourseProgramContent | null;
  programToggleLabel: string;
  detailsLabel: string;
  ctaLabel: string;
};

export function PoetCourseCard({
  courseHref,
  bookingHref,
  image,
  title,
  description,
  tagLine,
  variant,
  unoptimized,
  program,
  programToggleLabel,
  detailsLabel,
  ctaLabel,
}: Props) {
  return (
    <li className="flex h-full min-h-0 w-full min-w-0 list-none flex-col">
      <article
        className={`poet-course-card--${variant} group flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-poet-gold/20 bg-poet-surface/55 shadow-gold-sm backdrop-blur-sm transition duration-500 ease-out hover:-translate-y-0.5 hover:border-poet-gold/45 hover:shadow-gold sm:hover:-translate-y-1`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-950">
          <MediaCoverBlurred
            src={image}
            alt={title}
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            unoptimized={unoptimized}
            frameClassName="absolute inset-0"
            coverObjectPosition={variant === "acting" ? "50% 18%" : "center 22%"}
          />
          <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-poet-bg via-poet-bg/5 to-transparent opacity-80" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4 text-zinc-100 sm:p-5">
        {tagLine ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-poet-gold/75">{tagLine}</p>
        ) : null}
        <h3 className="relative mt-2 font-display text-[1.35rem] font-semibold leading-tight tracking-tight sm:text-[1.45rem]">
          <Link
            href={courseHref}
            className="text-gradient-gold no-underline outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-poet-gold/60"
          >
            {title}
          </Link>
        </h3>
        <p className="relative mt-3 mb-5 line-clamp-4 text-[0.9375rem] leading-relaxed text-zinc-300 sm:line-clamp-5 sm:text-sm">
          {description}
        </p>

        {program ? (
          <details className="group/details relative mb-5 rounded-xl border border-poet-gold/20 bg-black/25 open:bg-black/40">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-poet-gold/60 [&::-webkit-details-marker]:hidden">
              <span>{programToggleLabel}</span>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-poet-gold/25 text-poet-gold transition group-open/details:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="border-t border-poet-gold/15 px-4 pb-4 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-poet-gold/85">{program.lessons}</p>
              <ol className="mt-3 space-y-3">
                {program.stages.map((stage) => (
                  <li key={`${stage.range}-${stage.title}`} className="grid grid-cols-[3.25rem_1fr] gap-2.5 text-xs leading-relaxed">
                    <span className="font-bold text-poet-gold">{stage.range}</span>
                    <span>
                      <strong className="block font-semibold text-zinc-200">{stage.title}</strong>
                      <span className="text-zinc-500">{stage.topics.join(" · ")}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Link href={courseHref} className="mt-4 inline-flex text-xs text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-100">
                {detailsLabel} ↗
              </Link>
            </div>
          </details>
        ) : null}

        {bookingHref.startsWith("http://") || bookingHref.startsWith("https://") || bookingHref.startsWith("#") ? (
          <a
            href={bookingHref}
            className="btn-poet poet-shine relative mt-auto inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-center text-sm font-semibold no-underline"
          >
            {ctaLabel}
          </a>
        ) : (
          <Link
            href={bookingHref}
            className="btn-poet poet-shine relative mt-auto inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-center text-sm font-semibold no-underline"
          >
            {ctaLabel}
          </Link>
        )}
        </div>
      </article>
    </li>
  );
}
