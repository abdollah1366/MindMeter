"use client";

import { useEffect, useRef, useState } from "react";
import type { PsychTest } from "@/lib/types";
import type { Answers } from "@/lib/scoring";
import { toPersianDigits } from "@/lib/scoring";
import {
  D2_COLS,
  D2_ROWS,
  D2_ROW_SECONDS,
  generateD2PracticeRow,
  generateD2Rows,
  maskFromIndices,
  tnFromMask,
  type D2Cell,
  type D2Row,
} from "@/data/d2-content";
import { buildD2Report } from "@/lib/d2";
import { saveResult, setPending } from "@/lib/history";
import { saveTestResult } from "@/server/results";
import { saveClinicianTestResult } from "@/server/clinician-tests";
import type { RunContext } from "./TestRunner";
import { track } from "@/lib/track-client";
import ResultView from "./ResultView";
import D2Stimulus from "./D2Stimulus";

type Phase = "intro" | "practice" | "practiceDone" | "row" | "result";
type Saved = { state: "saving" } | { state: "saved"; id: string } | { state: "guest" } | { state: "error" };
type PracticeFeedback = { correct: number; wrong: number; total: number };

const TARGET_EXAMPLE: D2Cell = { letter: "d", top: 2, bottom: 0, target: true };
const THREE_DASH_EXAMPLE: D2Cell = { letter: "d", top: 3, bottom: 0, target: false };
const P_EXAMPLE: D2Cell = { letter: "p", top: 1, bottom: 1, target: false };

const GRID =
  "grid grid-cols-[repeat(8,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(12,minmax(0,1fr))] lg:grid-cols-[repeat(16,minmax(0,1fr))]";

/** نمایش یک ردیف محرک؛ کلیک روی هر خانه آن را علامت می‌زند یا علامت را برمی‌دارد. */
function StimulusRow({
  cells,
  clicks,
  onToggle,
}: {
  cells: D2Cell[];
  clicks: Set<number>;
  onToggle: (index: number) => void;
}) {
  return (
    <div className={GRID} dir="ltr">
      {cells.map((cell, index) => {
        const selected = clicks.has(index);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onToggle(index)}
            aria-pressed={selected}
            aria-label={`محرک ${toPersianDigits(index + 1)}`}
            className={`flex items-center justify-center rounded-lg border px-1 py-1.5 transition ${
              selected
                ? "border-brand-700 bg-brand-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
            }`}
          >
            <D2Stimulus cell={cell} />
          </button>
        );
      })}
    </div>
  );
}

export default function D2Runner({ test, run }: { test: PsychTest; run?: RunContext }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rowIndex, setRowIndex] = useState(0);
  const [clicks, setClicks] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(D2_ROW_SECONDS);
  const [answers, setAnswers] = useState<Answers>({});
  const [practiceFeedback, setPracticeFeedback] = useState<PracticeFeedback | null>(null);
  const [saved, setSaved] = useState<Saved>({ state: "saving" });

  const answersRef = useRef<Answers>({});
  const clicksRef = useRef<Set<number>>(new Set());
  const rowsRef = useRef<D2Row[]>([]);
  const practiceRef = useRef<D2Row | null>(null);
  const deadlineRef = useRef(0);
  const commitRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (phase !== "row") return;
    const id = setInterval(() => {
      const remaining = deadlineRef.current - Date.now();
      if (remaining <= 0) {
        clearInterval(id);
        setSecondsLeft(0);
        commitRef.current();
      } else {
        setSecondsLeft(Math.ceil(remaining / 1000));
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, rowIndex]);

  function toggleCell(index: number) {
    const next = new Set(clicksRef.current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    clicksRef.current = next;
    setClicks(next);
  }

  function startRow(index: number) {
    clicksRef.current = new Set();
    setClicks(new Set());
    deadlineRef.current = Date.now() + D2_ROW_SECONDS * 1000;
    setSecondsLeft(D2_ROW_SECONDS);
    setRowIndex(index);
    setPhase("row");
  }

  function commitRow() {
    const mask = maskFromIndices(clicksRef.current);
    const tn = tnFromMask(mask, D2_COLS);
    const question = test.questions[rowIndex];
    const next: Answers = { ...answersRef.current, [`d2_click_${rowIndex + 1}`]: mask };
    if (question) next[question.id] = tn;
    answersRef.current = next;
    setAnswers(next);
    if (rowIndex + 1 < D2_ROWS) startRow(rowIndex + 1);
    else void finish(next);
  }

  commitRef.current = commitRow;

  async function finish(final: Answers) {
    setPhase("result");
    track("test_complete", { ref: test.slug });
    setSaved({ state: "saving" });

    // اجرای متخصص: نتیجه در پرونده‌ی مراجع ذخیره می‌شود و یک اعتبار کسر می‌گردد
    if (run) {
      try {
        const res = await saveClinicianTestResult(run.runId, test.slug, final);
        setSaved(res.ok ? { state: "saved", id: res.id } : { state: "error" });
      } catch {
        setSaved({ state: "error" });
      }
      return;
    }

    const report = buildD2Report(test, final);
    saveResult({
      testSlug: test.slug,
      testTitle: test.title,
      summary: `تمرکز: ${report.overall.title} · نمره تمرکز ${toPersianDigits(report.totals.cp)} · دقت ${toPersianDigits(Math.round(report.totals.acc))}٪`,
      takenAt: Date.now(),
    });
    try {
      const res = await saveTestResult(test.slug, final);
      if (res.ok) setSaved({ state: "saved", id: res.id });
      else if (res.reason === "auth") {
        setPending({ slug: test.slug, answers: final });
        setSaved({ state: "guest" });
      } else setSaved({ state: "error" });
    } catch {
      setSaved({ state: "error" });
    }
  }

  function begin() {
    const seed = Math.floor(Math.random() * 0x7fffffff);
    rowsRef.current = generateD2Rows(seed);
    practiceRef.current = generateD2PracticeRow(seed);
    const initial: Answers = { d2_seed: seed };
    answersRef.current = initial;
    setAnswers(initial);
    clicksRef.current = new Set();
    setClicks(new Set());
    setPracticeFeedback(null);
    setSaved({ state: "saving" });
    setRowIndex(0);
    track("test_start", { ref: test.slug });
    setPhase("practice");
  }

  function checkPractice() {
    const practice = practiceRef.current;
    if (!practice) return;
    const targets = practice.cells.map((cell, i) => (cell.target ? i : -1)).filter((i) => i >= 0);
    const correct = targets.filter((i) => clicksRef.current.has(i)).length;
    const wrong = [...clicksRef.current].filter((i) => !practice.cells[i]?.target).length;
    setPracticeFeedback({ correct, wrong, total: targets.length });
    setPhase("practiceDone");
  }

  function startMain() {
    setPracticeFeedback(null);
    startRow(0);
  }

  function restart() {
    setPhase("intro");
    setAnswers({});
    answersRef.current = {};
    clicksRef.current = new Set();
    setClicks(new Set());
    setRowIndex(0);
    setSecondsLeft(D2_ROW_SECONDS);
    setPracticeFeedback(null);
    setSaved({ state: "saving" });
  }

  if (phase === "result") {
    return <ResultView test={test} answers={answers} saved={saved} onRestart={restart} forPatientName={run?.patientName} />;
  }

  if (phase === "intro") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {run && (
          <p className="mb-4 rounded-xl bg-calm-50 p-3 text-sm leading-7 text-calm-700">
            این تست توسط شما برای مراجع «{run.patientName}» اجرا می‌شود و نتیجه در پرونده‌ی او ذخیره می‌گردد.
          </p>
        )}
        <h2 className="text-xl font-extrabold text-brand-700">آزمون توجه و تمرکز d2</h2>
        <p className="mt-3 leading-8 text-slate-600">{test.instructions}</p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-700">قاعده‌ی هدف را دقیق به خاطر بسپارید</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <D2Stimulus cell={TARGET_EXAMPLE} />
              <div>
                <p className="text-sm font-bold text-emerald-800">هدف</p>
                <p className="text-xs leading-6 text-emerald-700">d با دقیقاً دو خط در مجموع</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <D2Stimulus cell={THREE_DASH_EXAMPLE} />
              <div>
                <p className="text-sm font-bold text-slate-700">غیرهدف</p>
                <p className="text-xs leading-6 text-slate-500">d با یک، سه یا چهار خط</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <D2Stimulus cell={P_EXAMPLE} />
              <div>
                <p className="text-sm font-bold text-slate-700">غیرهدف</p>
                <p className="text-xs leading-6 text-slate-500">حرف p در هر حالتی</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-lg font-extrabold text-brand-700">{toPersianDigits(D2_ROWS)}</p>
            <p className="text-xs text-slate-500">ردیف اصلی</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-lg font-extrabold text-brand-700">{toPersianDigits(D2_ROW_SECONDS)} ثانیه</p>
            <p className="text-xs text-slate-500">زمان هر ردیف</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-lg font-extrabold text-brand-700">{toPersianDigits(D2_COLS)}</p>
            <p className="text-xs text-slate-500">محرک در هر ردیف</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">
          ابتدا یک ردیف تمرینی بدون محدودیت زمان انجام می‌دهید و بازخورد می‌بینید. سپس ۱۴ ردیف اصلی هر کدام ۲۰ ثانیه
          نمایش داده می‌شود و به‌طور خودکار به ردیف بعد می‌رود. در هر ردیف روی حرف‌های هدف کلیک کنید؛ کلیک دوباره علامت را
          برمی‌دارد.
        </p>

        <button onClick={begin} className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
          شروع آزمون
        </button>
      </div>
    );
  }

  if (phase === "practice") {
    const practice = practiceRef.current;
    if (!practice) return null;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-700">ردیف تمرینی (بدون زمان)</span>
          <span className="text-sm text-slate-500">
            {toPersianDigits(clicks.size)} محرک علامت‌گذاری‌شده
          </span>
        </div>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          فقط حرف d با دقیقاً دو خط کوتاه در مجموع را انتخاب کنید. حرف p هرگز هدف نیست.
        </p>
        <div className="mt-4">
          <StimulusRow cells={practice.cells} clicks={clicks} onToggle={toggleCell} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">هر تعداد که لازم است وقت دارید؛ وقتی آماده بودید تمرین را پایان دهید.</p>
          <button onClick={checkPractice} className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700">
            پایان تمرین
          </button>
        </div>
      </div>
    );
  }

  if (phase === "practiceDone" && practiceFeedback) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-extrabold text-brand-700">نتیجه‌ی ردیف تمرینی</h2>
        <p className="mt-3 leading-8 text-slate-600">
          از {toPersianDigits(practiceFeedback.total)} هدف، {toPersianDigits(practiceFeedback.correct)} هدف را درست پیدا
          کردید.
          {practiceFeedback.wrong > 0
            ? ` ${toPersianDigits(practiceFeedback.wrong)} انتخاب نادرست هم ثبت شد.`
            : " هیچ انتخاب نادرستی نداشتید."}
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
          اگر با قاعده‌ی هدف آشنا شدید، آزمون اصلی را شروع کنید. در آزمون اصلی برای هر ردیف ۲۰ ثانیه فرصت دارید.
        </p>
        <button onClick={startMain} className="mt-6 rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700">
          شروع آزمون اصلی
        </button>
      </div>
    );
  }

  if (phase === "row") {
    const row = rowsRef.current[rowIndex];
    if (!row) return null;
    const urgent = secondsLeft <= 5;
    const timePercent = Math.max(0, Math.min(100, (secondsLeft / D2_ROW_SECONDS) * 100));
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-700">
            ردیف {toPersianDigits(rowIndex + 1)} از {toPersianDigits(D2_ROWS)}
          </span>
          <span className={`text-sm font-bold ${urgent ? "text-rose-600" : "text-slate-600"}`}>
            زمان باقی‌مانده: {toPersianDigits(secondsLeft)} ثانیه
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all ${urgent ? "bg-rose-500" : "bg-brand-500"}`}
            style={{ width: `${timePercent}%` }}
          />
        </div>

        <p className="mt-4 text-sm text-slate-500">
          حرف‌های d با دقیقاً دو خط در مجموع را علامت بزنید. کلیک دوباره علامت را برمی‌دارد.
        </p>

        <div className="mt-3">
          <StimulusRow cells={row.cells} clicks={clicks} onToggle={toggleCell} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          {toPersianDigits(clicks.size)} محرک علامت‌گذاری‌شده · پس از پایان زمان، ردیف بعد به‌طور خودکار آغاز می‌شود.
        </p>
      </div>
    );
  }

  return null;
}
