"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeatingAdminForm({ action, children, className }: {
  action: (form: FormData) => Promise<void>; children: React.ReactNode; className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return <form className={className} onSubmit={async e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true); setError("");
    try { await action(data); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить"); }
    finally { setPending(false); }
  }}>
    <fieldset disabled={pending} className="contents">{children}</fieldset>
    {pending && <span role="status" className="text-sm text-zinc-400">Сохраняем…</span>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </form>;
}
