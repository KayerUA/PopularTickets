import { getTranslations } from "next-intl/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { logSupabasePostgrestError } from "@/lib/supabase/logError";

type TitleNs = "Home" | "EventPage";

type Props = {
  locale: AppLocale;
  error: PostgrestError;
  titleNamespace: TitleNs;
  titleKey: "loadError" | "loadQueryError";
};

export async function SupabaseQueryErrorPanel({ locale, error, titleNamespace, titleKey }: Props) {
  logSupabasePostgrestError(`${titleNamespace}.${titleKey}`, error);

  const tTitle = await getTranslations({ locale, namespace: titleNamespace });
  const tHint = await getTranslations({ locale, namespace: "SupabaseHint" });

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="poet-safe-x mx-auto max-w-2xl py-12 text-left sm:py-16">
      <p className="font-medium text-red-400">{tTitle(titleKey)}</p>
      <p className="mt-4 text-sm text-zinc-400">{tHint("queryFailedIntro")}</p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-500">
        <li>{tHint("queryFailedVercel")}</li>
        <li>{tHint("queryFailedSchema")}</li>
        <li>{tHint("queryFailedServiceRole")}</li>
        <li>{tHint("queryFailedRedeploy")}</li>
      </ul>
      {isDev ? (
        <pre className="mt-6 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-400">
          {tHint("queryFailedDevPrefix")}
          {"\n"}
          {error.message}
          {error.code ? `\ncode: ${error.code}` : ""}
        </pre>
      ) : null}
    </div>
  );
}
