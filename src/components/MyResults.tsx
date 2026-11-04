"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clearResults, loadResults, type SavedResult } from "@/lib/history";

export default function MyResults() {
  const [results, setResults] = useState<SavedResult[] | null>(null);

  useEffect(() => setResults(loadResults()), []);

  if (results === null) return null;

  if (!results.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
        هنوز تستی انجام نداده‌اید.{" "}
        <Link href="/tests" className="text-brand-600 hover:underline">
          اولین تست را شروع کنید
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {results.map((r) => (
          <li key={r.takenAt} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div>
              <Link href={`/tests/${r.testSlug}`} className="font-bold hover:text-brand-600">
                {r.testTitle}
              </Link>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(r.takenAt).toLocaleDateString("fa-IR", { dateStyle: "long" })}
              </p>
            </div>
            <p className="text-sm text-brand-700">{r.summary}</p>
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          clearResults();
          setResults([]);
        }}
        className="mt-6 text-sm text-rose-600 hover:underline"
      >
        پاک کردن همه‌ی نتایج
      </button>
    </>
  );
}
