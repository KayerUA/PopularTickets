"use client";

import { useState } from "react";

type Props = {
  text: string;
  label: string;
  copiedLabel: string;
};

export function CopyTextButton({ text, label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="rounded-lg border border-poet-gold/30 bg-poet-gold/10 px-3 py-1.5 text-xs font-medium text-poet-gold-bright transition hover:border-poet-gold/50 hover:bg-poet-gold/15"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
