"use client";

import { useState, useTransition } from "react";

type Props = {
  deleteAction: (formData: FormData) => Promise<{ error?: string } | void>;
  id: string;
  title: string;
  entityLabel: string;
  paidOrders?: number;
};

export function AdminDeleteButton({ deleteAction, id, title, entityLabel, paidOrders = 0 }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const blocked = paidOrders > 0;

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || blocked}
        title={
          blocked
            ? `Есть ${paidOrders} оплаченных заказов — удаление заблокировано`
            : undefined
        }
        onClick={() => {
          if (blocked) return;
          const ok = window.confirm(
            `Удалить «${title}»?\n\n${entityLabel} исчезнет с сайта. Неоплаченные заказы и билеты будут удалены. Действие необратимо.`,
          );
          if (!ok) return;
          setError(null);
          start(async () => {
            const fd = new FormData();
            fd.set("id", id);
            const res = await deleteAction(fd);
            if (res && "error" in res && res.error) setError(res.error);
          });
        }}
        className="text-xs text-red-400/90 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Удаление…" : "Удалить"}
      </button>
      {error ? <span className="max-w-[12rem] text-right text-[10px] leading-snug text-red-400">{error}</span> : null}
    </span>
  );
}
