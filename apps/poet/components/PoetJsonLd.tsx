type Props = { data: object };

/** JSON-LD (schema.org) для Popular Poet. */
export function PoetJsonLd({ data }: Props) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
