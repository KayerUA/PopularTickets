import type { PoetIntentHubExpansion } from "@/lib/poetIntentHubTypes";
import type { PoetTrialDisplay } from "@/lib/poetTrials";

function improvMatch(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("impro") || t.includes("импров") || t.includes("імпров");
}

function playbackMatch(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("playback") || t.includes("play-back") || t.includes("плей");
}

/** Фильтр пробных/событий для intent-хаба (как в fetchPoetIntentTicketEvents). */
export function filterTrialsForIntentCluster(
  trials: PoetTrialDisplay[],
  cluster: PoetIntentHubExpansion["ticketsCluster"],
): PoetTrialDisplay[] {
  const filtered = trials.filter((trial) => {
    const blob = `${trial.title} ${trial.body ?? ""}`;
    if (cluster === "improv") return improvMatch(blob);
    if (cluster === "playback") return playbackMatch(blob);
    if (cluster === "trial") return true;
    return !playbackMatch(blob) || improvMatch(blob) || cluster === "theatre";
  });

  return (cluster === "theatre" ? trials : filtered.length ? filtered : trials).filter((t) => {
    if (!t.starts_at) return false;
    return new Date(t.starts_at).getTime() >= Date.now();
  });
}
