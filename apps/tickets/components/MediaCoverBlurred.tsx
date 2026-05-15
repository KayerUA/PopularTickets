import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  unoptimized?: boolean;
  frameClassName?: string;
  /** Для обложек событий: object-position на переднем слое (contain). */
  coverObjectPosition?: string;
};

/**
 * Кадр обложки: размытый fill подложка + чёткий слой object-contain.
 * Подложка сильнее заливает «полосы» у вертикальных постеров в 16:9.
 */
export function MediaCoverBlurred({
  src,
  alt,
  sizes,
  priority,
  unoptimized,
  frameClassName = "relative aspect-video w-full overflow-hidden bg-zinc-950",
  coverObjectPosition,
}: Props) {
  return (
    <div className={frameClassName}>
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className="pointer-events-none absolute inset-0 z-0 scale-[1.38] object-cover object-center blur-3xl saturate-[1.18] opacity-[0.82] brightness-110 contrast-[1.05]"
        aria-hidden
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className="pointer-events-none absolute inset-0 z-[1] object-contain object-center"
        style={coverObjectPosition ? { objectPosition: coverObjectPosition } : undefined}
      />
    </div>
  );
}
