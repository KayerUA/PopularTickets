import { safeJsonLdStringify } from "@/lib/safeJsonLd";

type Props = { data: object };

/** JSON-LD (schema.org) для Popular Poet. */
export function PoetJsonLd({ data }: Props) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }} />;
}
