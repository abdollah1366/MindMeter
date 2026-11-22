"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import {
  READING_ALOUD_DOMAINS,
  READING_ALOUD_PASSAGES,
  READING_ALOUD_SCALE,
  READING_ALOUD_SEVERITY_LABELS,
  type ReadingAloudPerformance,
} from "@/lib/speech/reading-aloud-types";
import { computeReadingAloudSummary } from "@/lib/speech/reading-aloud-payload";
import { saveReadingAloudAssessment } from "@/server/reading-aloud";

export type ReadingAloudPatientOption = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
};

type Props = {
  patients: ReadingAloudPatientOption[];
  initialPatientId?: string;
};

const SEX_LABEL: Record<string, string> = {
  MALE: "مرد",
  FEMALE: "زن",
  OTHER: "سایر",
};

const INITIAL_PERFORMANCE: ReadingAloudPerformance = {
  durationSeconds: 30,
  wordsRead: 0,
  misreadWords: 0,
  omissions: 0,
  additions: 0,
  selfCorrections: 0,
};

const PERFORMANCE_FIELDS: {
  key: keyof ReadingAloudPerformance;
  label: string;
  hint: string;
  max?: number;
}[] = [
  { key: "durationSeconds", label: "مدت خواندن (ثانیه)", hint: "زمان از آغاز تا پایان خواندن", max: 3600 },
  { key: "wordsRead", label: "واژه‌های خوانده‌شده", hint: "تعداد کل واژه‌های ادا شده" },
  { key: "misreadWords", label: "واژه‌های اشتباه خوانده‌شده", hint: "واژه‌هایی که نادرست تلفظ شدهاند" },
  { key: "omissions", label: "واژه‌های حذفشده", hint: "واژههایی از متن که خوانده نشدهاند" },
  { key: "additions", label: "واژه‌های اضافه", hint: "واژههایی که در متن نبوده و اضافه شدهاند" },
  { key: "selfCorrections", label: "تصحيحات خودبهخود", hint: "مواردی که مراجع خودش تصحیح کرد" },
];

export default function ReadingAloudRunner({ patients, initialPatientId }: Props) {
  const router = useRouter();
  const fallback =
    patients.find((patient) => patient.id === initialPatientId)?.id ??
    patients[0]?.id ??
    "";
  const [patientId, setPatientId] = useState(fallback);
  const [passageId, setPassageId] = useState<string>(READING_ALOUD_PASSAGES[0].id);
  const [performance, setPerformance] = useState<ReadingAloudPerformance>(INITIAL_PERFORMANCE);
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(READING_ALOUD_DOMAINS.map((domain) => [domain.id, 0])),
  );
  const [overallSeverity, setOverallSeverity] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? null;
  const selectedPassage =
    READING_ALOUD_PASSAGES.find((passage) => passage.id === passageId) ?? READING_ALOUD_PASSAGES[0];

  const summary = useMemo(
    () => computeReadingAloudSummary(performance),
    [performance],
  );

  const observationError =
    performance.misreadWords + performance.omissions > performance.wordsRead
      ? "مجموع واژههای اشتباه و حذفشده نمیتواند از واژههای خواندهشده بیشتر باشد."
      : "";

  function updateField(key: keyof ReadingAloudPerformance, raw: string) {
    setPerformance((previous) => ({ ...previous, [key]: Math.max(0, Math.floor(Number(raw) || 0)) }));
  }

  async function submit() {
    if (saving) return;
    if (!selectedPatient) {
      setError("لطفاً پرونده‌ی مراجع را انتخاب کنید.");
      return;
    }
    if (observationError) {
      setError(observationError);
      return;
    }
    if (performance.durationSeconds < 1) {
      setError("مدت خواندن باید حداقل ۱ ثانیه باشد.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await saveReadingAloudAssessment({
        patientId: selectedPatient.id,
        passageId: selectedPassage.id,
        performance,
        ratings: READING_ALOUD_DOMAINS.map((domain) => ({
          id: domain.id,
          domain: domain.domain,
          label: domain.label,
          score: ratings[domain.id],
        })),
        overallSeverity,
        notes: notes.trim() || null,
        status: "FINAL",
      });
      if (response.ok) {
        router.push(`/speech/reading-aloud/result/${response.id}`);
        router.refresh();
        return;
      }
      setError(
        response.reason === "auth"
          ? "برای ثبت ارزیابی باید وارد شوید."
          : response.reason === "forbidden"
            ? "دسترسی به پرونده‌ی این مراجع مجاز نیست."
            : "اطلاعات ارزیابی معتبر نیست.",
      );
    } catch {
      setError("ثبت ارزیابی ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 font-sans">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="reading-patient" className="text-sm font-bold text-slate-700">
          مراجع
        </label>
        <p className="mt-1 text-xs text-slate-500">
          فقط مراجعانی که پرونده‌شان را با شما به اشتراک گذاشتهاند.
        </p>
        <select
          id="reading-patient"
          value={patientId}
          onChange={(event) => {
            setPatientId(event.target.value);
            setError("");
          }}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
              {patient.age !== null ? ` — ${toPersianDigits(patient.age)} سال` : ""}
              {patient.sex ? ` — ${SEX_LABEL[patient.sex] ?? patient.sex}` : ""}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="reading-passage" className="text-sm font-bold text-slate-700">
          متن خواندن
        </label>
        <p className="mt-1 text-xs text-slate-500">
          متنی که مراجع با صدای بلند میخواند. شمارش واژهها بر اساس همین متن است.
        </p>
        <select
          id="reading-passage"
          value={passageId}
          onChange={(event) => setPassageId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          {READING_ALOUD_PASSAGES.map((passage) => (
            <option key={passage.id} value={passage.id}>
              {passage.title} — {toPersianDigits(passage.wordCount)} واژه
            </option>
          ))}
        </select>
        <div className="mt-3 rounded-xl bg-slate-50 p-4 leading-9 text-slate-700" dir="rtl">
          {selectedPassage.lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">مشاهدات خواندن</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          اعداد را حین اجرای تکلیف ثبت کنید. خلاصهی عملکرد بهطور خودکار از همین
          اعداد محاسبه میشود.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PERFORMANCE_FIELDS.map((field) => (
            <div key={field.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label
                htmlFor={`reading-${field.key}`}
                className="text-sm font-bold text-slate-800"
              >
                {field.label}
              </label>
              <p className="text-xs text-slate-500">{field.hint}</p>
              <input
                id={`reading-${field.key}`}
                type="number"
                min={0}
                max={field.max}
                step={1}
                value={performance[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          ))}
        </div>
        {observationError ? (
          <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {observationError}
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">مجموع خطاها</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(summary.errorCount)}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">واژههای صحیح</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(summary.wordsCorrect)}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">درصد دقت</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(summary.accuracyPercent)}٪
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <dt className="text-[11px] text-brand-700">واژه صحیح در دقیقه</dt>
            <dd className="mt-1 text-lg font-extrabold text-brand-800">
              {toPersianDigits(summary.wordsCorrectPerMinute)}
            </dd>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">امتیازدهی کیفی</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          برای هر جنبه، شدت اختلال را از ۰ (طبیعی) تا ۴ (بسیار شدید) انتخاب کنید.
        </p>
        <div className="mt-4 space-y-3">
          {READING_ALOUD_DOMAINS.map((domain) => (
            <div
              key={domain.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-slate-800">{domain.label}</span>
                  <p className="text-xs text-slate-500">{domain.description}</p>
                </div>
                <select
                  value={ratings[domain.id]}
                  onChange={(event) =>
                    setRatings((previous) => ({
                      ...previous,
                      [domain.id]: Number(event.target.value),
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                  aria-label={`امتیاز ${domain.label}`}
                >
                  {READING_ALOUD_SCALE.map((option) => (
                    <option key={option.score} value={option.score}>
                      {option.score} — {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label className="text-sm font-bold text-slate-700">شدت کلی (نظر ارزیاب)</label>
        <p className="mt-1 text-xs text-slate-500">
          این مقدار یک قضاوت بالینی است و از جمع امتیازها محاسبه نمیشود.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {READING_ALOUD_SCALE.map((option) => (
            <button
              key={option.score}
              type="button"
              onClick={() => setOverallSeverity(option.score)}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                overallSeverity === option.score
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
              }`}
            >
              {option.score} — {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          سطح انتخابشده: {READING_ALOUD_SEVERITY_LABELS[overallSeverity]}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="reading-notes" className="text-sm font-bold text-slate-700">
          توضیحات ارزیاب (اختیاری)
        </label>
        <textarea
          id="reading-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500"
          placeholder="خطاهای مشاهدهشده، الگوی مکث و شرایط اجرای تکلیف"
        />
      </section>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !selectedPatient || Boolean(observationError)}
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {saving ? "در حال ثبت…" : "ثبت ارزیابی"}
        </button>
        <Link href="/panel" className="text-sm text-slate-500 hover:text-brand-600">
          انصراف
        </Link>
      </div>
    </div>
  );
}
