export type CourseShot = {
  src: string;
  width: number;
  height: number;
};

export const IMPROV_COVER = {
  src: "/courses/improv/cover-v3.webp",
  width: 1600,
  height: 2133,
} as const;

/** Кадры с занятий и показов. Пропорции исходника, без обрезки. */
export const IMPROV_GALLERY = [
  { src: "/courses/improv/01.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/02.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/03.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/04.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/05.webp", width: 1125, height: 2000 },
  { src: "/courses/improv/06.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/07.webp", width: 1125, height: 2000 },
  { src: "/courses/improv/08.webp", width: 1125, height: 2000 },
  { src: "/courses/improv/09.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/10.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/11.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/12.webp", width: 1080, height: 1920 },
  { src: "/courses/improv/13.webp", width: 1125, height: 2000 },
  { src: "/courses/improv/14.webp", width: 1125, height: 2000 },
  { src: "/courses/improv/15.webp", width: 1500, height: 2000 },
  { src: "/courses/improv/16.webp", width: 1125, height: 2000 },
  { src: "/courses/improv/17.webp", width: 1125, height: 2000 },
  { src: "/courses/improv/18.webp", width: 941, height: 1672 },
  { src: "/courses/improv/19.webp", width: 1125, height: 2000 },
] as const;
