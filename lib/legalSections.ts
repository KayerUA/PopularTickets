import type { LegalArticleBlock } from "@/components/LegalArticle";

/** Sekcje s1…sN z namespace next-intl (klucze `s{i}Title` / `s{i}Body`). */
export function legalDocBlocks(t: (key: string) => string, sectionCount: number): LegalArticleBlock[] {
  const blocks: LegalArticleBlock[] = [];
  for (let n = 1; n <= sectionCount; n++) {
    blocks.push({
      title: t(`s${n}Title`),
      body: t(`s${n}Body`),
    });
  }
  return blocks;
}
