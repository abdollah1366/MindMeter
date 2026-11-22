"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import {
  EXPRESSIVE_LANGUAGE_DOMAINS,
  EXPRESSIVE_LANGUAGE_SCALE,
  EXPRESSIVE_LANGUAGE_SEVERITY_LABELS,
  EXPRESSIVE_LANGUAGE_TASKS,
} from "@/lib/speech/expressive-language-types";
import { saveExpressiveLanguageAssessment } from "@/server/expressive-language";

export type ExpressiveLanguagePatientOption = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
};

type Props = {
  patients: ExpressiveLanguagePatientOption[];
  initialPatientId?: string;
};

const SEX_LABEL: Record<string, string> = {
  MALE: "مرد",
  FEMALE: "زن",
  OTHER: "سایر",
};

export default function ExpressiveLanguageRunner({
  patients,
  initialPatientId,
}: Props) {
  const router = useRouter();
  const fallback =
    patients.find((patient) => patient.id === initialPatientId)?.id ??
    patients[0]?.id ??
    "";
  const [patientId, setPatientId] = useState(fallback);
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(EXPRESSIVE_LANGUAGE_DOMAINS.map((domain) => [domain.id, 0])),
  );
  const [overallSeverity, setOverallSeverity] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? null;

  async function submit() {
    if (saving) return;
    if (!selectedPatient) {
      setError("لطفاً پرونده‌ی مراجع را انتخاب کنید.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await saveExpressiveLanguageAssessment({
        patientId: selectedPatient.id,
        ratings: EXPRESSIVE_LANGUAGE_DOMAINS.map((domain) => ({
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
        router.push(`/speech/expressive-language/result/${response.id}`);
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
        <label htmlFor="expressive-patient" className="text-sm font-bold text-slate-700">
          مراجع
        </label>
        <p className="mt-1 text-xs text-slate-500">
          فقط مراجعانی که پرونده‌شان را با شما به اشتراک گذاشته‌اند.
        </p>
        <select
          id="expressive-patient"
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

      <details className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">
          تکالیف پیشنهادی برای ارزیابی
        </summary>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
          {EXPRESSIVE_LANGUAGE_TASKS.map((task) => (
            <li key={task.title} className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="font-bold text-slate-700">{task.title}: </span>
              {task.prompt}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          این تکالیف فقط برای ساختاردهی مشاهده‌ی بالینی هستند و مجموعه‌ی استاندارد
          یا نرم‌مرجع ندارند.
        </p>
      </details>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">امتیازدهی دامنه‌ها</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          برای هر دامنه، شدت اختلال را از ۰ (طبیعی) تا ۴ (بسیار شدید) انتخاب کنید.
        </p>
        <div className="mt-4 space-y-3">
          {EXPRESSIVE_LANGUAGE_DOMAINS.map((domain) => (
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
                  {EXPRESSIVE_LANGUAGE_SCALE.map((option) => (
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
          این مقدار یک قضاوت بالینی است و از جمع امتیاز دامنه‌ها محاسبه نمی‌شود.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPRESSIVE_LANGUAGE_SCALE.map((option) => (
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
          سطح انتخاب‌شده: {EXPRESSIVE_LANGUAGE_SEVERITY_LABELS[overallSeverity]}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="expressive-notes" className="text-sm font-bold text-slate-700">
          توضیحات ارزیاب (اختیاری)
        </label>
        <textarea
          id="expressive-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500"
          placeholder="نمونه‌های گفتار، خطاهای مشاهده‌شده و شرایط ارزیابی"
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
          disabled={saving || !selectedPatient}
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
