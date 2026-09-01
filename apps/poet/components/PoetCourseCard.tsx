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
    <li className="h-full list-none">
      <article
        className={`poet-course-card poet-course-card--${variant} group relative flex h-full flex-col overflow-hidden rounded-2xl border p-4 text-inherit shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] transition duration-500 hover:-translate-y-0.5 sm:p-5`}
      >
        <div className="poet-shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden />
        <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-poet-gold/20 bg-zinc-950">
          <MediaCoverBlurred
            src={image}
            alt={title}
            sizes="(max-width:640px) calc(100vw - 4rem), (max-width:1024px) 50vw, 240px"
            unoptimized={unoptimized}
            frameClassName="absolute inset-0"
            coverObjectPosition={variant === "acting" ? "50% 6%" : undefined}
          />
        </div>

        {tagLine ? (
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{tagLine}</p>
        ) : null}
        <h3 className="relative mt-2 font-display text-[1.35rem] font-semibold leading-tight tracking-tight sm:text-[1.45rem]">
          <Link
            href={courseHref}
            className="text-gradient-gold no-underline outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-poet-gold/60"
          >
            {title}
          </Link>
        </h3>
        <p className="relative mt-3 line-clamp-4 text-[0.9375rem] leading-relaxed text-zinc-300 sm:line-clamp-5 sm:text-sm">
          {description}
        </p>

        {program ? (
          <details className="group/details relative mt-5 rounded-xl border border-poet-gold/20 bg-black/25 open:bg-black/40">
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
            className="btn-poet btn-poet-theatre relative mt-5 inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-center text-sm font-semibold no-underline"
          >
            {ctaLabel}
          </a>
        ) : (
          <Link
            href={bookingHref}
            className="btn-poet btn-poet-theatre relative mt-5 inline-flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-center text-sm font-semibold no-underline"
          >
            {ctaLabel}
          </Link>
        )}
      </article>
    </li>
  );
}
