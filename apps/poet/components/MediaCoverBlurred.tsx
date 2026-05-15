import Image from "next/image";

type Props = {
  src: string;
  /** Основной alt; дубликат для blur без озвучивания скринридером. */
  alt: string;
  sizes: string;
  priority?: boolean;
  unoptimized?: boolean;
  /** Обёртка: соотношение сторон и скругления (по умолчанию 16:9). */
  frameClassName?: string;
};

/**
 * Афишный кадр: фон — слегка увеличенный размытый crop (заполняет «полосы»),
 * поверх — целое изображение object-contain (без жёсткой обрезки постера).
 */
export function MediaCoverBlurred({
  src,
  alt,
  sizes,
  priority,
  unoptimized,
  frameClassName = "relative aspect-video w-full overflow-hidden bg-zinc-950",
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
      />
    </div>
  );
}
