import { MediaCoverBlurred } from "@/components/MediaCoverBlurred";
import { eventCoverObjectPosition } from "@/lib/eventCoverFocal";
import { isOptimizableEventImage } from "@/lib/imageOptimization";
import type { TrialHubPhoto } from "@/lib/trialCourseHub";

type Props = {
  photos: TrialHubPhoto[];
  alt: string;
  /** Запасная обложка курса, если с прошедших дат ничего нет. */
  fallbackSrc?: string | null;
};

function Shot({
  photo,
  alt,
  priority,
  className,
  sizes,
}: {
  photo: TrialHubPhoto;
  alt: string;
  priority?: boolean;
  className: string;
  sizes: string;
}) {
  return (
    <div className={className}>
      <MediaCoverBlurred
        src={photo.src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        unoptimized={!isOptimizableEventImage(photo.src)}
        coverObjectPosition={eventCoverObjectPosition(photo.focalX, photo.focalY)}
        frameClassName="absolute inset-0"
      />
    </div>
  );
}

function MobileCarousel({ shots, alt }: { shots: TrialHubPhoto[]; alt: string }) {
  return (
    <div className="sm:hidden">
      <ul
        className="-mx-0 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={alt}
      >
        {shots.map((photo, index) => (
          <li
            key={photo.src}
            className="relative aspect-[4/5] w-[78%] max-w-[320px] shrink-0 snap-center overflow-hidden"
          >
            <Shot
              photo={photo}
              alt={alt}
              priority={index === 0}
              sizes="78vw"
              className="absolute inset-0"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesktopMosaic({ shots, alt }: { shots: TrialHubPhoto[]; alt: string }) {
  if (shots.length === 1) {
    return (
      <Shot
        photo={shots[0]!}
        alt={alt}
        priority
        sizes="896px"
        className="relative hidden aspect-video w-full overflow-hidden bg-zinc-950 sm:block"
      />
    );
  }

  if (shots.length === 2) {
    return (
      <div className="hidden grid-cols-2 gap-2 bg-zinc-950 sm:grid">
        {shots.map((photo, index) => (
          <Shot
            key={photo.src}
            photo={photo}
            alt={alt}
            priority={index === 0}
            sizes="448px"
            className="relative aspect-[4/3] overflow-hidden"
          />
        ))}
      </div>
    );
  }

  const lead = shots[0]!;
  const side = shots.slice(1, 3);
  const rest = shots.slice(3, 6);

  return (
    <div className="hidden flex-col gap-2 bg-zinc-950 sm:flex">
      <div className="grid grid-cols-[1.45fr_1fr] gap-2">
        <Shot
          photo={lead}
          alt={alt}
          priority
          sizes="560px"
          className="relative min-h-[280px] overflow-hidden"
        />
        <div className="grid grid-cols-1 gap-2">
          {side.map((photo) => (
            <Shot
              key={photo.src}
              photo={photo}
              alt={alt}
              sizes="320px"
              className="relative aspect-[4/3] overflow-hidden"
            />
          ))}
        </div>
      </div>
      {rest.length > 0 ? (
        <div
          className={`grid gap-2 ${
            rest.length === 1 ? "grid-cols-1" : rest.length === 2 ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {rest.map((photo) => (
            <Shot
              key={photo.src}
              photo={photo}
              alt={alt}
              sizes="300px"
              className="relative aspect-[4/3] overflow-hidden"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Галерея кадров с прошедших пробных:
 * на мобиле — горизонтальный snap-слайдер, на десктопе — компактная мозаика.
 */
export function TrialHubGallery({ photos, alt, fallbackSrc }: Props) {
  const shots =
    photos.length > 0
      ? photos
      : fallbackSrc?.trim()
        ? [{ src: fallbackSrc.trim(), focalX: 50, focalY: fallbackSrc.endsWith("/courses/akterka.jpg") ? 6 : 50 }]
        : [];

  if (shots.length === 0) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-950 sm:aspect-video">
        <div className="absolute inset-0 bg-gradient-to-br from-poet-gold-dim/35 via-poet-bg to-zinc-950" />
      </div>
    );
  }

  return (
    <div className="bg-zinc-950">
      <MobileCarousel shots={shots} alt={alt} />
      <DesktopMosaic shots={shots} alt={alt} />
    </div>
  );
}
