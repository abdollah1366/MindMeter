"use client";

import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
        باز کردن لینک
      </a>
      <button type="button" onClick={copy} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
        {copied ? "کپی شد ✓" : "کپی لینک"}
      </button>
    </div>
  );
}
