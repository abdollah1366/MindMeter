"use client";

import Link from "next/link";
import type { PsychTest } from "@/lib/types";
import { alertsFor, scoreTest, type Answers } from "@/lib/scoring";
import ScoreBreakdown from "./ScoreBreakdown";

type Props = {
  test: PsychTest;
  answers: Answers;
  /** وضعیت ذخیره در پرونده */
  saved: { state: "saving" } | { state: "saved"; id: string } | { state: "guest" } | { state: "error" };
  onRestart: () => void;
};

export default function ResultView({ test, answers, saved, onRestart }: Props) {
  const scores = scoreTest(test, answers);
  const alerts = alertsFor(test, answers);
  const concerning = alerts.length > 0 || scores.some((s) => ["moderate", "high", "severe"].includes(s.result?.level ?? ""));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-l from-brand-50 to-calm-50 p-5">
        <p className="text-sm text-slate-500">نتیجه‌ی {test.code}</p>
        <h2 className="mt-1 text-xl font-extrabold text-brand-700">
          {scores.length === 1 ? scores[0].result?.title : "نیم‌رخ شما در مقیاس‌های این تست"}
        </h2>
      </div>

      <ScoreBreakdown test={test} scores={scores} alerts={alerts} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {saved.state === "saved" && (
          <>
            <p className="text-sm text-slate-600">✓ این نتیجه در پرونده‌ی شما ذخیره شد.</p>
            <Link
              href={`/reports/${saved.id}`}
              className="mt-3 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-white hover:bg-brand-700"
            >
              مشاهده و چاپ گزارش رسمی
            </Link>
          </>
        )}
        {saved.state === "saving" && <p className="text-sm text-slate-500">در حال ذخیره در پرونده…</p>}
        {saved.state === "guest" && (
          <>
            <p className="text-sm leading-7 text-slate-600">
              برای ذخیره‌ی این نتیجه در پرونده‌ی خود و دریافت گزارش قابل چاپ، با شماره موبایل وارد شوید.
            </p>
            <Link
              href="/login?next=/save-pending"
              className="mt-3 inline-block rounded-xl bg-warm-500 px-5 py-2.5 text-white hover:bg-warm-600"
            >
              ورود و ذخیره‌ی نتیجه
            </Link>
          </>
        )}
        {saved.state === "error" && <p className="text-sm text-rose-700">ذخیره‌ی نتیجه با خطا روبه‌رو شد.</p>}
      </div>

      {concerning && (
        <div className="rounded-2xl border border-calm-200 bg-calm-50 p-5">
          <p className="font-bold text-calm-700">صحبت با یک متخصص می‌تواند کمک کند</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            نتیجه‌ی شما نشان می‌دهد که بهتر است با یک روانشناس یا روانپزشک مشورت کنید. درخواست مشاوره بدهید تا متخصص مناسب به شما معرفی
            شود، یا مستقیم ویزیت آنلاین رزرو کنید.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link
              href={saved.state === "saved" ? `/referral/new?result=${saved.id}` : "/referral/new"}
              className="rounded-xl bg-calm-600 px-5 py-2.5 text-white hover:bg-calm-700"
            >
              درخواست مشاوره
            </Link>
            <Link href="/clinicians" className="rounded-xl border border-calm-200 bg-white px-5 py-2.5 text-calm-700">
              مشاهده‌ی متخصصان
            </Link>
          </div>
        </div>
      )}

      <p className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
        این نتیجه یک غربالگری است و تشخیص بالینی محسوب نمی‌شود. برای ارزیابی دقیق با روانشناس یا روانپزشک مشورت کنید.
      </p>

      <div className="flex flex-wrap gap-3">
        <button onClick={onRestart} className="rounded-xl border border-slate-300 bg-white px-5 py-2 hover:bg-slate-50">
          انجام دوباره
        </button>
        <Link href="/tests" className="rounded-xl border border-slate-300 bg-white px-5 py-2 hover:bg-slate-50">
          تست‌های دیگر
        </Link>
      </div>
    </div>
  );
}
