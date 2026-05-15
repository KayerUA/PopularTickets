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
 * При фиксированном 16:9 вертикальная афиша не даёт пустых «столбов», горизонтальное фото — без грубого кропа.
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
        className="pointer-events-none absolute inset-0 z-0 scale-[1.18] object-cover object-center blur-2xl saturate-[1.08] opacity-[0.55]"
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
