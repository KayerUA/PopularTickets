import Link from "next/link";
import { adminLogin } from "@/app/actions/auth";

export default function AdminLoginPage() {
  return (
    <div className="poet-safe-x mx-auto flex min-h-dvh max-w-md flex-col justify-center py-8">
      <div className="rounded-2xl border border-poet-gold/20 bg-poet-surface/60 p-6 shadow-gold-sm backdrop-blur-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-zinc-50">Вход в админку</h1>
        <p className="mt-2 text-sm text-zinc-500">Пароль задаётся в переменной ADMIN_PASSWORD.</p>
        <form action={adminLogin} className="mt-6 space-y-4">
          <label className="block text-sm text-zinc-300">
            Пароль
            <input
              name="password"
              type="password"
              required
              className="mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2.5 text-base text-white sm:min-h-10 sm:py-2 sm:text-sm"
            />
          </label>
          <button type="submit" className="btn-poet poet-shine w-full py-3 text-sm">
            Войти
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-600">
          <Link href="/pl" className="inline-flex min-h-10 items-center justify-center text-poet-gold hover:text-poet-gold-bright">
            На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
