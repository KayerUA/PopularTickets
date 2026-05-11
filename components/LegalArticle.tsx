import { Link } from "@/i18n/navigation";

export type LegalArticleBlock = {
  title: string;
  /** Akapity oddzielone podwójnym znakiem nowej linii (\\n\\n). */
  body: string;
};

type Props = {
  backLabel: string;
  title: string;
  updatedLabel: string;
  disclaimer?: string;
  blocks: LegalArticleBlock[];
};

function BodyParagraphs({ text }: { text: string }) {
  const parts = text.split(/\n\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {parts.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-zinc-300">
          {p}
        </p>
      ))}
    </div>
  );
}

export function LegalArticle({ backLabel, title, updatedLabel, disclaimer, blocks }: Props) {
  return (
    <div className="poet-safe-x mx-auto max-w-3xl py-8 sm:py-12">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="inline-flex min-h-10 items-center rounded-lg py-1 text-poet-gold hover:text-poet-gold-bright">
          {backLabel}
        </Link>
      </p>
      <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-gradient-gold sm:mt-6 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-xs text-zinc-500">{updatedLabel}</p>

      <article className="mt-8 space-y-8 rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-4 shadow-gold-sm backdrop-blur-sm sm:p-8">
        {blocks.map((b, i) => (
          <section key={i}>
            <h2 className="font-display text-lg font-medium text-zinc-100 sm:text-xl">{b.title}</h2>
            <div className="mt-3">
              <BodyParagraphs text={b.body} />
            </div>
          </section>
        ))}
      </article>

      {disclaimer ? (
        <p className="mt-8 text-xs leading-relaxed text-zinc-500">{disclaimer}</p>
      ) : null}
    </div>
  );
}
