"use client";

import { useActionState, useTransition, useState, useEffect } from "react";
import { checkinLogin, checkinLogout } from "@/app/actions/checkin-auth";
import {
  lookupTicketAction,
  markTicketUsedAction,
  type CheckinLookup,
  type CheckinTicketRow,
} from "@/app/actions/checkin";
import { CheckInQrScanner } from "@/components/CheckInQrScanner";

const initial: CheckinLookup = { status: "idle" };

type ValidTicket = {
  ticketId: string;
  ticketNumber: string;
  eventTitle: string;
  used: boolean;
};

function loginErrorMessage(code: string | undefined): string | null {
  if (code === "bad_code") return "Неверный пароль контролёра.";
  if (code === "unconfigured") return "Check-in не настроен на сервере (CHECKIN_PASSWORD).";
  if (code === "jwt") return "Не задан ADMIN_JWT_SECRET (≥16 символов).";
  return null;
}

function TicketResultCard({
  ticket,
  onMarked,
}: {
  ticket: ValidTicket;
  onMarked: () => void;
}) {
  const [markMsg, setMarkMsg] = useState<string | null>(null);
  const [marking, startMark] = useTransition();

  return (
    <div className="space-y-4 rounded-2xl border border-poet-gold/20 bg-poet-surface/50 p-5">
      <p className="text-sm text-zinc-400">Статус</p>
      <p className="text-lg font-medium text-white">{ticket.used ? "Уже использован" : "Действителен"}</p>
      <p className="text-sm text-zinc-400">Событие</p>
      <p className="text-white">{ticket.eventTitle}</p>
      <p className="text-sm text-zinc-400">Номер билета</p>
      <p className="font-mono text-poet-gold-bright">{ticket.ticketNumber}</p>

      {!ticket.used ? (
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
                onMarked();
              }
            });
          }}
        >
          <input type="hidden" name="ticketId" value={ticket.ticketId} />
          <button type="submit" disabled={marking} className="btn-poet poet-shine w-full px-6 text-sm sm:w-auto">
            {marking ? "Сохранение…" : "Отметить вход"}
          </button>
          {markMsg ? <p className="text-sm text-zinc-300">{markMsg}</p> : null}
        </form>
      ) : null}
    </div>
  );
}

function ChoicesList({
  tickets,
  onPick,
}: {
  tickets: CheckinTicketRow[];
  onPick: (t: CheckinTicketRow) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-poet-gold/20 bg-poet-surface/40 p-4">
      <p className="text-sm text-zinc-400">Найдено билетов: {tickets.length}. Выберите нужный:</p>
      <ul className="space-y-2">
        {tickets.map((t) => (
          <li key={t.ticketId}>
            <button
              type="button"
              onClick={() => onPick(t)}
              className="w-full rounded-xl border border-poet-gold/25 bg-zinc-950/60 px-4 py-3 text-left transition hover:border-poet-gold/45 hover:bg-poet-gold/5"
            >
              <div className="font-mono text-sm text-poet-gold-bright">{t.ticketNumber}</div>
              <div className="mt-1 text-sm text-white">{t.eventTitle}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {t.buyerName} · {t.email}
                {t.phone ? ` · ${t.phone}` : ""}
              </div>
              <div className="mt-1 text-xs text-zinc-400">{t.used ? "Уже использован" : "Не отмечен"}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  authRequired: boolean;
  authenticated: boolean;
  loginError?: string;
};

export function CheckInPanel({ authRequired, authenticated, loginError }: Props) {
  const [state, lookupAction, pendingLookup] = useActionState(lookupTicketAction, initial);
  const [ticketCode, setTicketCode] = useState("");
  const [selected, setSelected] = useState<ValidTicket | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [state]);

  const valid: ValidTicket | null =
    selected ??
    (state.status === "valid"
      ? {
          ticketId: state.ticketId,
          ticketNumber: state.ticketNumber,
          eventTitle: state.eventTitle,
          used: state.used,
        }
      : null);

  const choices = state.status === "choices" ? state.tickets : null;
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
          <button type="submit" className="btn-poet poet-shine min-h-11 w-full px-6 text-sm sm:w-auto">
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
            QR / UUID / номер TKT-… / email / телефон (от 7 цифр) — затем отметка входа.
            {!authRequired ? " Локальный режим — без пароля контролёра." : null}
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
          Поиск билета
          <input
            name="code"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            className="mt-1.5 w-full min-h-11 rounded-xl border border-poet-gold/20 bg-zinc-950 px-3 py-2.5 font-mono text-base text-white sm:min-h-10 sm:py-2 sm:text-sm"
            placeholder="QR / TKT-… / email / +48…"
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
          Сервис проверки билетов временно недоступен.
        </p>
      ) : null}
      {state.status === "invalid" ? <p className="text-red-400">Билет не найден.</p> : null}
      {state.status === "rate_limited" ? (
        <p className="text-amber-300">Слишком много запросов. Подождите минуту.</p>
      ) : null}

      {choices && !selected ? (
        <ChoicesList
          tickets={choices}
          onPick={(t) =>
            setSelected({
              ticketId: t.ticketId,
              ticketNumber: t.ticketNumber,
              eventTitle: t.eventTitle,
              used: t.used,
            })
          }
        />
      ) : null}

      {valid ? (
        <TicketResultCard
          ticket={valid}
          onMarked={() => {
            setTicketCode("");
            setSelected(null);
          }}
        />
      ) : null}
    </div>
  );
}
