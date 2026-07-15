"use client";

import { useState } from "react";

export function AmbassadorCopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-400/10 px-3 py-2 text-xs font-bold text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-400/15"
    >
      {copied ? "Скопировано" : label}
    </button>
  );
}

