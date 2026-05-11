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
      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-400">{tHint("queryFailedHelp")}</p>
      {isDev ? (
        <>
          <p className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-400">
            {error.message}
            {error.code ? ` · ${error.code}` : ""}
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-400">
            {tHint("queryFailedDevPrefix")}
            {"\n"}
            {error.details ? `details: ${error.details}\n` : ""}
            {error.hint ? `hint: ${error.hint}` : ""}
          </pre>
        </>
      ) : null}
    </div>
  );
}
