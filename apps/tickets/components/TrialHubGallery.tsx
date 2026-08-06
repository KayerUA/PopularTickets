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
}: {
  photo: TrialHubPhoto;
  alt: string;
  priority?: boolean;
  className: string;
}) {
  return (
    <div className={className}>
      <MediaCoverBlurred
        src={photo.src}
        alt={alt}
        sizes="(max-width:768px) 90vw, 560px"
        priority={priority}
        unoptimized={!isOptimizableEventImage(photo.src)}
        coverObjectPosition={eventCoverObjectPosition(photo.focalX, photo.focalY)}
        frameClassName="absolute inset-0"
      />
    </div>
  );
}

/**
 * Галерея кадров с прошедших пробных: несколько фото сразу, без карточного шума.
 */
export function TrialHubGallery({ photos, alt, fallbackSrc }: Props) {
  const shots =
    photos.length > 0
      ? photos
      : fallbackSrc?.trim()
        ? [{ src: fallbackSrc.trim(), focalX: 50, focalY: 50 }]
        : [];

  if (shots.length === 0) {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950 sm:aspect-video">
        <div className="absolute inset-0 bg-gradient-to-br from-poet-gold-dim/35 via-poet-bg to-zinc-950" />
      </div>
    );
  }

  if (shots.length === 1) {
    return (
      <Shot
        photo={shots[0]!}
        alt={alt}
        priority
        className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950 sm:aspect-video"
      />
    );
  }

  if (shots.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 sm:gap-2">
        {shots.map((photo, index) => (
          <Shot
            key={photo.src}
            photo={photo}
            alt={alt}
            priority={index === 0}
            className="relative aspect-[4/5] overflow-hidden sm:aspect-[4/3]"
          />
        ))}
      </div>
    );
  }

  const lead = shots[0]!;
  const side = shots.slice(1, 3);
  const rest = shots.slice(3, 6);

  return (
    <div className="flex flex-col gap-1.5 bg-zinc-950 sm:gap-2">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1.45fr_1fr] sm:gap-2">
        <Shot
          photo={lead}
          alt={alt}
          priority
          className="relative aspect-[16/10] overflow-hidden sm:aspect-auto sm:min-h-[280px]"
        />
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-2">
          {side.map((photo, index) => (
            <Shot
              key={photo.src}
              photo={photo}
              alt={alt}
              priority={index === 0}
              className="relative aspect-[4/3] overflow-hidden sm:min-h-0 sm:flex-1"
            />
          ))}
        </div>
      </div>
      {rest.length > 0 ? (
        <div className={`grid gap-1.5 sm:gap-2 ${rest.length === 1 ? "grid-cols-1" : rest.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {rest.map((photo) => (
            <Shot
              key={photo.src}
              photo={photo}
              alt={alt}
              className="relative aspect-[4/3] overflow-hidden"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
