import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

type Variant = "setup" | "disconnected";

const titleKey: Record<Variant, "titleSetup" | "titleDisconnected"> = {
  setup: "titleSetup",
  disconnected: "titleDisconnected",
};

export async function SupabaseSetupHint({ variant, locale }: { variant: Variant; locale?: AppLocale }) {
  const loc = locale ?? routing.defaultLocale;
  const t = await getTranslations({ locale: loc, namespace: "SupabaseHint" });

  return (
    <div className="poet-safe-x mx-auto max-w-lg py-16 sm:py-20">
      <div className="rounded-2xl border border-poet-gold/25 bg-poet-surface/60 p-6 shadow-gold-sm backdrop-blur-md sm:rounded-3xl sm:p-8">
        <h1 className="font-display text-xl font-semibold text-zinc-50 sm:text-2xl">{t(titleKey[variant])}</h1>
        {variant === "disconnected" ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t("introDisconnected")}</p>
            <p className="mt-6 text-center text-sm">
              <Link
                href="/firma"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-poet-gold hover:text-poet-gold-bright"
              >
                {t("linkCompany")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {t("intro")}{" "}
              <code className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-poet-gold-bright">.env.example</code>{" "}
              {t("and")}{" "}
              <code className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-poet-gold-bright">.env.local</code>{" "}
              {t("fill")}
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-300">
              <li>
                <code className="font-mono text-xs text-poet-gold-bright">NEXT_PUBLIC_SUPABASE_URL</code>
              </li>
              <li>
                <code className="font-mono text-xs text-poet-gold-bright">SUPABASE_SERVICE_ROLE_KEY</code>
              </li>
            </ul>
            <p className="mt-4 text-xs text-zinc-500">
              {t("sqlNote")} <code className="font-mono">supabase/schema.sql</code>. {t("restartNote")}{" "}
              <code className="font-mono">npm run dev</code>.
            </p>
            <p className="mt-6 text-center text-sm">
              <Link
                href="/firma"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-poet-gold hover:text-poet-gold-bright"
              >
                {t("linkCompany")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
