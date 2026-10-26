import Image from "next/image";
import type { CourseShot } from "@/lib/improvGallery";

type Props = {
  shots: readonly CourseShot[];
  title: string;
  lead: string;
  alt: string;
};

export function PoetImprovGallery({ shots, title, lead, alt }: Props) {
  return (
    <section className="mt-12 sm:mt-14" aria-labelledby="course-gallery-heading">
      <h2 id="course-gallery-heading" className="font-display text-xl font-medium text-zinc-100 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">{lead}</p>
      <ul className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {shots.map((photo, photoIndex) => (
          <li key={photo.src} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black">
            <Image
              src={photo.src}
              alt={`${alt}, ${photoIndex + 1}`}
              fill
              sizes="(max-width: 1024px) 50vw, 33vw"
              quality={75}
              className="object-cover object-[center_22%]"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
