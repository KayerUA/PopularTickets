"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/app/actions/auth";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/admin/login");

  if (isLogin) {
    return <div className="min-h-dvh overflow-x-hidden bg-poet-bg text-zinc-100">{children}</div>;
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-poet-bg text-zinc-100">
      <div className="border-b border-poet-gold/15 bg-poet-bg/80">
        <div className="poet-safe-x mx-auto flex max-w-6xl flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            href="/admin"
            className="font-display min-h-10 text-base font-semibold text-gradient-gold sm:text-lg"
          >
            Админка
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 sm:gap-3">
            <Link
              className="inline-flex min-h-10 items-center rounded-lg px-2 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright"
              href="/admin/poet-courses"
            >
              Курси Poet
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-lg px-2 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright"
              href="/admin/events/new"
            >
              Новое событие
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-lg px-2 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright"
              href="/admin/orders"
            >
              Заказы
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-lg px-2 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright"
              href="/pl"
            >
              На сайт
            </Link>
            <form action={adminLogout} className="inline-flex items-center">
              <button
                type="submit"
                className="min-h-10 rounded-lg px-2 text-zinc-400 transition hover:bg-poet-gold/5 hover:text-poet-gold-bright"
              >
                Выйти
              </button>
            </form>
          </nav>
        </div>
      </div>
      <div className="poet-safe-x mx-auto max-w-6xl py-6 sm:py-8">{children}</div>
    </div>
  );
}
