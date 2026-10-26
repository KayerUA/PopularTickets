import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { CourseShot } from "@/lib/improvGallery";

type Props = {
  cover: CourseShot;
  tag: string;
  title: string;
  body: string;
  hint: string;
  cta: string;
};

export function PoetImprovHero({ cover, tag, title, body, hint, cta }: Props) {
  return (
    <article className="mt-6 overflow-hidden rounded-3xl border border-poet-gold/25 bg-poet-surface/25 shadow-gold-sm">
      <div className="grid lg:grid-cols-[minmax(240px,380px)_1fr] lg:items-stretch">
        <div className="bg-black">
          <Image
            src={cover.src}
            alt={title}
            width={cover.width}
            height={cover.height}
            priority
            quality={75}
            sizes="(max-width: 1024px) 100vw, 760px"
            className="h-auto w-full"
          />
        </div>
        <div className="flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          {tag ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{tag}</p>
          ) : null}
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-gradient-gold sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">{body}</p>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-zinc-500">{hint}</p>
          <div className="mt-6">
            <Link href="#proby-kursu" className="btn-poet-theatre btn-poet inline-flex no-underline">
              {cta}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
