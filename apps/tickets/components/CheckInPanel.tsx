"use client";

import { useActionState, useTransition, useState } from "react";
import { checkinLogin, checkinLogout } from "@/app/actions/checkin-auth";
import { lookupTicketAction, markTicketUsedAction, type CheckinLookup } from "@/app/actions/checkin";
import { CheckInQrScanner } from "@/components/CheckInQrScanner";

const initial: CheckinLookup = { status: "idle" };

function loginErrorMessage(code: string | undefined): string | null {
  if (code === "bad_code") return "Неверный пароль контролёра.";
  if (code === "unconfigured") return "Check-in не настроен на сервере (CHECKIN_PASSWORD).";
  if (code === "jwt") return "Не задан ADMIN_JWT_SECRET (≥16 символов).";
  return null;
}

type Props = {
  authRequired: boolean;
  authenticated: boolean;
  loginError?: string;
};

export function CheckInPanel({ authRequired, authenticated, loginError }: Props) {
  const [state, lookupAction, pendingLookup] = useActionState(lookupTicketAction, initial);
  const [markMsg, setMarkMsg] = useState<string | null>(null);
  const [marking, startMark] = useTransition();
  const [ticketCode, setTicketCode] = useState("");

  const valid = state.status === "valid" ? state : null;
  const showLogin = authRequired && !authenticated;

  if (showLogin) {
    const err = loginErrorMessage(loginError);
    return (
      <div className="poet-safe-x mx-auto max-w-xl space-y-8 py-8 sm:py-10">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-50 sm:text-3xl">Check-in</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Введите пароль контролёра — после входа можно сканировать QR и отмечать билеты без повторного ввода.
          </p>
        </div>
        <form action={checkinLogin} className="space-y-4 rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-4 sm:p-5">
          <label className="block text-sm text-zinc-300">
            Пароль контролёра
            <input
              name="checkinPassword"
              type="password"
              required
              autoFocus
              className="mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2.5 text-base text-white sm:min-h-10 sm:py-2 sm:text-sm"
              autoComplete="current-password"
            />
          </label>
          {err ? <p className="text-sm text-red-300">{err}</p> : null}
          <button
            type="submit"
            className="btn-poet poet-shine min-h-11 w-full px-6 text-sm sm:w-auto"
          >
            Войти
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="poet-safe-x mx-auto max-w-xl space-y-8 py-8 sm:space-y-10 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-zinc-50 sm:text-3xl">Check-in</h1>
          <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">
            Сканируйте QR или вставьте UUID билета, затем отметьте вход.
            {!authRequired ? " Локальный режим — без кода контролёра." : null}
          </p>
        </div>
        {authRequired ? (
          <form action={checkinLogout}>
            <button
              type="submit"
              className="min-h-10 rounded-full border border-poet-gold/25 px-4 py-2 text-xs text-zinc-400 transition hover:border-poet-gold/45 hover:text-zinc-200"
            >
              Выйти
            </button>
          </form>
        ) : null}
      </div>

      <form action={lookupAction} className="space-y-4 rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-4 sm:p-5">
        <label className="block text-sm text-zinc-300">
          Код билета (UUID)
          <input
            name="code"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            className="mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2.5 font-mono text-base text-white sm:min-h-10 sm:py-2 sm:text-sm"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <CheckInQrScanner onUuid={(uuid) => setTicketCode(uuid)} />
        <button
          type="submit"
          disabled={pendingLookup}
          className="min-h-11 w-full rounded-full border border-poet-gold/30 bg-poet-gold/10 px-5 py-2.5 text-sm font-semibold text-poet-gold-bright transition hover:bg-poet-gold/20 disabled:opacity-50 sm:w-auto sm:min-h-10 sm:py-2"
        >
          {pendingLookup ? "Проверка…" : "Проверить"}
        </button>
      </form>

      {state.status === "unauthorized" ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Сессия истекла. Обновите страницу и войдите снова.
        </p>
      ) : null}
      {state.status === "unconfigured" ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Сервис проверки билетов временно недоступен. Проверьте настройки сервера или попробуйте позже.
        </p>
      ) : null}
      {state.status === "invalid" ? (
        <p className="text-red-400">Недействительный билет.</p>
      ) : null}
      {state.status === "rate_limited" ? (
        <p className="text-amber-300">Слишком много запросов. Подождите минуту.</p>
      ) : null}

      {valid ? (
        <div className="space-y-4 rounded-2xl border border-poet-gold/20 bg-poet-surface/50 p-5">
          <p className="text-sm text-zinc-400">Статус</p>
          <p className="text-lg font-medium text-white">
            {valid.used ? "Уже использован" : "Действителен"}
          </p>
          <p className="text-sm text-zinc-400">Событие</p>
          <p className="text-white">{valid.eventTitle}</p>
          <p className="text-sm text-zinc-400">Номер билета</p>
          <p className="font-mono text-poet-gold-bright">{valid.ticketNumber}</p>

          {!valid.used ? (
            <form
              className="space-y-3 border-t border-poet-gold/15 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                setMarkMsg(null);
                const fd = new FormData(e.currentTarget);
                startMark(async () => {
                  const res = await markTicketUsedAction(fd);
                  if (!res.ok) setMarkMsg(res.error ?? "Ошибка");
                  else {
                    setMarkMsg("Отмечено как использованный.");
                    setTicketCode("");
                  }
                });
              }}
            >
              <input type="hidden" name="ticketId" value={valid.ticketId} />
              <button
                type="submit"
                disabled={marking}
                className="btn-poet poet-shine w-full px-6 text-sm sm:w-auto"
              >
                {marking ? "Сохранение…" : "Отметить вход"}
              </button>
              {markMsg ? <p className="text-sm text-zinc-300">{markMsg}</p> : null}
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
