"use client";

import Link from "next/link";
import type { PsychTest } from "@/lib/types";
import { alertsFor, scoreTest, type Answers } from "@/lib/scoring";
import ScoreBreakdown from "./ScoreBreakdown";
import LevelBreakdown from "./LevelBreakdown";
import ResultNote from "./ResultNote";
import NormPanel from "./NormPanel";
import InventoryProfile from "./InventoryProfile";
import StrengthsProfile from "./StrengthsProfile";
import BigFiveProfile from "./BigFiveProfile";
import { isStrengths } from "@/lib/strengths";
import { isInventory, validityStatus, elevatedScales } from "@/lib/inventory";
import { useEffect, useState } from "react";
import { getNormReport } from "@/server/norms";
import type { NormReport } from "@/lib/norms";

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
  const savedId = saved.state === "saved" ? saved.id : null;
  const [norm, setNorm] = useState<NormReport | null>(null);
  useEffect(() => {
    if ((test.kind !== "ability" && !test.normMetric && !test.builtInNorms) || !savedId) return;
    getNormReport(savedId).then(setNorm).catch(() => {});
  }, [savedId, test.kind, test.normMetric, test.builtInNorms]);

  const inventory = isInventory(test);
  const strengths = isStrengths(test);
  const bigfive = test.report === "bigfive";
  const concerning = strengths || bigfive
    ? alerts.length > 0
    : inventory
    ? alerts.length > 0 || elevatedScales(test, scores).length > 0 || validityStatus(test, scores).level !== "ok"
    : alerts.length > 0 || scores.some((s) => ["moderate", "high", "severe"].includes(s.result?.level ?? ""));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-l from-brand-50 to-calm-50 p-5">
        <p className="text-sm text-slate-500">نتیجه‌ی {test.code}</p>
        <h2 className="mt-1 text-xl font-extrabold text-brand-700">
          {bigfive ? "نیم‌رخ شخصیت شما" : strengths ? "استعدادهای شما" : scores.length === 1 ? scores[0].result?.title : "نیم‌رخ شما در مقیاس‌های این تست"}
        </h2>
      </div>

      {bigfive ? (
        <BigFiveProfile test={test} scores={scores} age={norm?.age} sex={norm?.sex} />
      ) : strengths ? (
        <StrengthsProfile test={test} scores={scores} />
      ) : inventory ? (
        <InventoryProfile test={test} scores={scores} alerts={alerts} answers={answers} norm={norm} showCritical />
      ) : (
        <ScoreBreakdown test={test} scores={scores} alerts={alerts} />
      )}

      {test.kind === "ability" && <LevelBreakdown test={test} answers={answers} />}

      {norm && !inventory && <NormPanel report={norm} />}
      {test.kind === "ability" && saved.state === "guest" && (
        <p className="rounded-2xl bg-calm-50 p-4 text-sm leading-7 text-calm-700">
          برای مقایسه‌ی نتیجه با هم‌سن‌ها و هم‌جنس‌ها (صدک و نمره‌ی استاندارد)، وارد شوید تا نتیجه در پرونده‌تان ذخیره شود.
        </p>
      )}

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

      {test.resultNote && <ResultNote note={test.resultNote} resultId={saved.state === "saved" ? saved.id : undefined} />}

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
