import type { AppLocale } from "@/i18n/routing";
import type { PoetIntentClusterId } from "@/lib/poetIntentClusters";

export type PoetIntentSection = {
  heading: string;
  paragraphs: string[];
};

export type PoetIntentHubExpansion = {
  sections: PoetIntentSection[];
  extraFaq: { q: string; a: string }[];
  relatedHubSlugs: string[];
  ticketsCluster: "improv" | "theatre" | "trial" | "playback";
};

export function ticketsClusterForPoetIntent(cluster: PoetIntentClusterId): PoetIntentHubExpansion["ticketsCluster"] {
  if (cluster === "trial") return "trial";
  if (cluster === "playback") return "playback";
  if (cluster === "improv-course") return "improv";
  return "theatre";
}

export type PoetIntentPageView = {
  slug: string;
  cluster: PoetIntentClusterId;
  sections: PoetIntentSection[];
  faq: { q: string; a: string }[];
  relatedHubSlugs: string[];
  ticketsCluster: PoetIntentHubExpansion["ticketsCluster"];
};
