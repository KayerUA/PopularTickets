import { safeJsonLdStringify } from "@/lib/safeJsonLd";

type Props = { data: object };

/** JSON-LD для SEO (schema.org). */
export function JsonLd({ data }: Props) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }} />
  );
}
