import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  unoptimized?: boolean;
  frameClassName?: string;
  /** События: точка кадрирования для object-cover / contain. */
  coverObjectPosition?: string;
  /**
   * `cover` — заполняет кадр (витрина, читаемая афиша, допустим обрез).
   * `contain` — целиком картинка в кадре (узкая полоска у вертикальных постеров).
   */
  fit?: "cover" | "contain";
};

/**
 * Обложка: размытый фон + чёткий слой. По умолчанию передний слой `object-cover`
 * (крупно, как на нормальных афишах), не `contain`.
 */
export function MediaCoverBlurred({
  src,
  alt,
  sizes,
  priority,
  unoptimized,
  frameClassName = "relative aspect-video w-full overflow-hidden bg-zinc-950",
  coverObjectPosition,
  fit = "cover",
}: Props) {
  const pos = coverObjectPosition ? { objectPosition: coverObjectPosition } : undefined;
  const blurPos = fit === "cover" ? pos : undefined;

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
        style={blurPos}
        aria-hidden
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={
          fit === "cover"
            ? "pointer-events-none absolute inset-0 z-[1] object-cover object-center"
            : "pointer-events-none absolute inset-0 z-[1] object-contain object-center"
        }
        style={pos}
      />
    </div>
  );
}
