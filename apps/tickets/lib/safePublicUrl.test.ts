import { describe, expect, it } from "vitest";
import {
  isRenderableImageSrc,
  isValidHttpUrl,
  normalizeHttpUrl,
  resolveAbsoluteAssetUrl,
} from "@/lib/safePublicUrl";

describe("safePublicUrl", () => {
  const base = "https://www.populartickets.pl";

  it("isValidHttpUrl accepts https and normalizes scheme-less", () => {
    expect(isValidHttpUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isValidHttpUrl("maps.app.goo.gl/abc")).toBe(true);
    expect(isValidHttpUrl("")).toBe(false);
    expect(isValidHttpUrl("not a url")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });

  it("normalizeHttpUrl trims and adds https", () => {
    expect(normalizeHttpUrl("  https://maps.app.goo.gl/x  ")).toBe("https://maps.app.goo.gl/x");
    expect(normalizeHttpUrl("maps.app.goo.gl/x")).toMatch(/^https:\/\/maps\.app\.goo\.gl\/x/);
    expect(normalizeHttpUrl("")).toBeNull();
    expect(normalizeHttpUrl("bad url")).toBeNull();
  });

  it("resolveAbsoluteAssetUrl handles relative and absolute paths", () => {
    expect(resolveAbsoluteAssetUrl("/courses/impro.jpg", base)).toBe(`${base}/courses/impro.jpg`);
    expect(resolveAbsoluteAssetUrl("courses/impro.jpg", base)).toBe(`${base}/courses/impro.jpg`);
    expect(resolveAbsoluteAssetUrl("https://cdn.example.com/a.png", base)).toBe("https://cdn.example.com/a.png");
    expect(resolveAbsoluteAssetUrl("", base)).toBeNull();
    expect(resolveAbsoluteAssetUrl(":::invalid", base)).toBeNull();
  });

  it("isRenderableImageSrc", () => {
    expect(isRenderableImageSrc("/events/x.png")).toBe(true);
    expect(isRenderableImageSrc("https://x.supabase.co/storage/v1/object/public/a.png")).toBe(true);
    expect(isRenderableImageSrc("")).toBe(false);
    expect(isRenderableImageSrc(":::bad")).toBe(false);
  });
});
