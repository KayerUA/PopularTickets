import type { IntentClusterKey } from "@/lib/ticketsIntentRoutes";

const FAQ_CLUSTER_ALIAS: Partial<Record<IntentClusterKey, IntentClusterKey>> = {
  chamber: "theatre",
  adults: "evening",
};

function faqCluster(cluster: IntentClusterKey): IntentClusterKey {
  return FAQ_CLUSTER_ALIAS[cluster] ?? cluster;
}

/** Пары ключей перевода IntentDiscover для FAQ (Q, A). */
export function intentFaqTranslationKeys(cluster: IntentClusterKey): readonly (readonly [string, string])[] {
  const c = faqCluster(cluster);
  return [
    [`${c}FaqQ1`, `${c}FaqA1`],
    [`${c}FaqQ2`, `${c}FaqA2`],
    [`${c}FaqQ3`, `${c}FaqA3`],
    [`${c}FaqQ4`, `${c}FaqA4`],
    [`${c}FaqQ5`, `${c}FaqA5`],
  ] as const;
}
