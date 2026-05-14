"use client";

import { useActionState, useTransition, useState } from "react";
import { lookupTicketAction, markTicketUsedAction, type CheckinLookup } from "@/app/actions/checkin";
import { CheckInQrScanner } from "@/components/CheckInQrScanner";

const initial: CheckinLookup = { status: "idle" };

type Props = {
  checkinTokenRequired: boolean;
};

export function CheckInPanel({ checkinTokenRequired }: Props) {
  const [state, lookupAction, pendingLookup] = useActionState(lookupTicketAction, initial);
  const [markMsg, setMarkMsg] = useState<string | null>(null);
  const [marking, startMark] = useTransition();
  const [ticketCode, setTicketCode] = useState("");

  const valid = state.status === "valid" ? state : null;

  return (
    <div className="poet-safe-x mx-auto max-w-xl space-y-8 py-8 sm:space-y-10 sm:py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-zinc-50 sm:text-3xl">Check-in</h1>
        <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">
          Вставьте UUID билета из QR или из письма, либо отсканируйте QR камерой.
          {checkinTokenRequired ? (
            <>
              {" "}
              Код контролёра (<code className="text-zinc-300">CHECKIN_OPERATOR_TOKEN</code>) нужен и для проверки билета, и для отметки входа.
            </>
          ) : (
            <>
              {" "}
              Для отметки входа в продакшене задайте <code className="text-zinc-300">CHECKIN_OPERATOR_TOKEN</code> на сервере.
            </>
          )}
        </p>
        {checkinTokenRequired ? (
          <p className="mt-2 text-xs text-amber-300">Код контролёра обязателен для проверки и отметки.</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            Код контролёра не задан — отметка входа открыта (только для разработки).
          </p>
        )}
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
        {checkinTokenRequired ? (
          <label className="block text-sm text-zinc-300">
            Код контролёра
            <input
              name="operatorToken"
              type="password"
              className="mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2.5 text-base text-white sm:min-h-10 sm:py-2 sm:text-sm"
              autoComplete="off"
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={pendingLookup}
          className="min-h-11 w-full rounded-full border border-poet-gold/30 bg-poet-gold/10 px-5 py-2.5 text-sm font-semibold text-poet-gold-bright transition hover:bg-poet-gold/20 disabled:opacity-50 sm:w-auto sm:min-h-10 sm:py-2"
        >
          {pendingLookup ? "Проверка…" : "Проверить"}
        </button>
      </form>

      {state.status === "unconfigured" ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          База не подключена. Добавьте <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> и{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> в <code className="font-mono text-xs">.env.local</code> и перезапустите dev-сервер.
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
                  else setMarkMsg("Отмечено как использованный.");
                });
              }}
            >
              <input type="hidden" name="ticketId" value={valid.ticketId} />
              <label className="block text-sm text-zinc-300">
                Код контролёра
                <input
                  name="operatorToken"
                  type="password"
                  className="mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2.5 text-base text-white sm:min-h-10 sm:py-2 sm:text-sm"
                  autoComplete="off"
                />
              </label>
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
