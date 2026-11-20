"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import {
  GRBAS_COMPONENTS,
  GRBAS_MAX_SCORE,
  GRBAS_NO_TOTAL_NOTE,
  GRBAS_SAMPLE_SOURCES,
  GRBAS_SAMPLE_SOURCE_LABELS,
  type GrbasComponentKey,
  type GrbasSampleSource,
  type GrbasScores,
} from "@/lib/speech/grbas-types";
import { formatGrbasSummary, isGrbasScoresComplete } from "@/lib/speech/grbas-scoring";
import { saveGrbasAssessment } from "@/server/grbas";

export type GrbasPatientOption = {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
};

type DraftScores = Partial<Record<GrbasComponentKey, number>>;
type Step = 1 | 2;

type Props = {
  patients: GrbasPatientOption[];
  initialPatientId?: string;
};

const SEX_LABEL: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

/**
 * فرم ثبت ارزیابی GRBAS برای متخصص تأییدشده.
 * هیچ میکروفونی درخواست نمی‌شود، هیچ صوتی ضبط نمی‌شود و امتیازها فقط از
 * انتخاب ارزیاب می‌آیند؛ هیچ محاسبه‌ی خودکار یا نمره‌ی کلی وجود ندارد.
 */
export default function GrbasRunner({ patients, initialPatientId }: Props) {
  const router = useRouter();
  const fallbackPatient =
    patients.find((patient) => patient.id === initialPatientId)?.id ?? patients[0]?.id ?? "";

  const [step, setStep] = useState<Step>(1);
  const [patientId, setPatientId] = useState(fallbackPatient);
  const [sampleSource, setSampleSource] = useState<GrbasSampleSource>("IN_PERSON");
  const [sampleNote, setSampleNote] = useState("");
  const [scores, setScores] = useState<DraftScores>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? null;
  const complete = isGrbasScoresComplete(scores);
  const summary = useMemo(
    () => (isGrbasScoresComplete(scores) ? formatGrbasSummary(scores) : null),
    [scores],
  );

  function chooseScore(key: GrbasComponentKey, score: number) {
    setScores((previous) => ({ ...previous, [key]: score }));
    setError("");
  }

  function goNext() {
    if (!selectedPatient) {
      setError("لطفاً پرونده‌ی مراجع را انتخاب کنید.");
      return;
    }
    if (sampleSource === "OTHER" && !sampleNote.trim()) {
      setError("برای منبع «سایر»، توضیح منبع نمونه الزامی است.");
      return;
    }
    setError("");
    setStep(2);
  }

  function goPrevious() {
    setError("");
    setStep(1);
  }

  async function submit() {
    if (saving) return;
    if (!selectedPatient) {
      setStep(1);
      setError("لطفاً پرونده‌ی مراجع را انتخاب کنید.");
      return;
    }
    if (!isGrbasScoresComplete(scores)) {
      setError("برای هر پنج مؤلفه یک امتیاز ۰ تا ۳ انتخاب کنید.");
      return;
    }

    const finalScores: GrbasScores = scores;
    setSaving(true);
    setError("");
    try {
      const response = await saveGrbasAssessment({
        patientId: selectedPatient.id,
        scores: finalScores,
        sampleSource,
        sampleNote: sampleNote.trim() || null,
        notes: notes.trim() || null,
        status: "FINAL",
      });

      if (response.ok) {
        router.push(`/speech/grbas/result/${response.id}`);
        router.refresh();
        return;
      }

      setError(
        response.reason === "auth"
          ? "برای ثبت ارزیابی باید با حساب کاربری خود وارد شوید."
          : response.reason === "forbidden"
            ? "دسترسی به پرونده‌ی این مراجع مجاز نیست."
            : "اطلاعات ارزیابی معتبر یا کامل نیست.",
      );
    } catch {
      setError("ثبت ارزیابی ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 font-sans">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-bold text-slate-700">مرحله {toPersianDigits(step)} از ۲</span>
          <span className="text-xs text-slate-500">
            {step === 1 ? "انتخاب مراجع و منبع نمونه" : "امتیازدهی پنج مؤلفه"}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={2}>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: step === 1 ? "50%" : "100%" }} />
        </div>
      </section>

      {step === 1 ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div>
            <label htmlFor="grbas-patient" className="text-sm font-bold text-slate-700">
              مراجع
            </label>
            <p className="mt-1 text-xs text-slate-500">
              فقط مراجعانی نمایش داده می‌شوند که پرونده‌شان را با شما به اشتراک گذاشته‌اند.
            </p>
            <select
              id="grbas-patient"
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
          </div>

          <fieldset>
            <legend className="text-sm font-bold text-slate-700">منبع نمونه‌ی شنیداری</legend>
            <p className="mt-1 text-xs text-slate-500">
              در این نسخه فایل صوتی در سامانه بارگذاری یا ذخیره نمی‌شود؛ فقط منبع نمونه ثبت می‌شود.
            </p>
            <div className="mt-3 space-y-2">
              {GRBAS_SAMPLE_SOURCES.map((source) => (
                <label
                  key={source}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                    sampleSource === source
                      ? "border-brand-500 bg-brand-50 font-bold text-brand-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="grbas-sample-source"
                    value={source}
                    checked={sampleSource === source}
                    onChange={() => {
                      setSampleSource(source);
                      setError("");
                    }}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span>{GRBAS_SAMPLE_SOURCE_LABELS[source]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="grbas-sample-note" className="text-sm font-bold text-slate-700">
              توضیح منبع نمونه {sampleSource === "OTHER" ? "(الزامی)" : "(اختیاری)"}
            </label>
            <textarea
              id="grbas-sample-note"
              value={sampleNote}
              onChange={(event) => {
                setSampleNote(event.target.value);
                setError("");
              }}
              rows={2}
              maxLength={300}
              placeholder="مثلاً: نمونه‌ی ضبط‌شده در جلسه‌ی ارزیابی حضوری"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              مرحله‌ی بعد
            </button>
            <Link href="/panel" className="text-sm text-slate-500 hover:text-brand-600">
              بازگشت به پنل
            </Link>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-extrabold text-slate-800">امتیازدهی پنج مؤلفه</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              هر مؤلفه را مستقل از بقیه و بر اساس شنیده‌ی خود از نمونه، در بازه‌ی ۰ تا ۳ درجه‌بندی کنید.
              امتیاز G از جمع یا میانگین سایر مؤلفه‌ها ساخته نمی‌شود.
            </p>
          </section>

          {GRBAS_COMPONENTS.map((component) => (
            <fieldset key={component.key} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <legend className="flex flex-wrap items-center gap-2 px-1">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-sm font-extrabold text-slate-700" dir="ltr">
                  {component.key}
                </span>
                <span className="text-sm font-bold text-slate-800">{component.title}</span>
                <span dir="ltr" className="text-[10px] text-slate-400">
                  {component.titleEn}
                </span>
              </legend>
              <p className="mt-2 text-xs leading-6 text-slate-500">{component.description}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {component.levels.map((level, score) => {
                  const checked = scores[component.key] === score;
                  return (
                    <label
                      key={score}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        checked
                          ? "border-brand-500 bg-brand-50 font-bold text-brand-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`grbas-${component.key}`}
                        value={score}
                        checked={checked}
                        onChange={() => chooseScore(component.key, score)}
                        className="h-4 w-4 accent-brand-600"
                      />
                      <span className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs" dir="ltr">
                          {score}
                        </span>
                        <span>{level}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <label htmlFor="grbas-notes" className="text-sm font-bold text-slate-700">
              توضیحات ارزیاب (اختیاری)
            </label>
            <p className="mt-1 text-xs text-slate-500">
              مشاهدات، شرایط ضبط یا نکات مؤثر بر درجه‌بندی را بنویسید. حداکثر ۲۰۰۰ کاراکتر.
            </p>
            <textarea
              id="grbas-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="مثلاً: نمونه در محیط ساکت ضبط شده است…"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-700">پیش‌نمایش امتیازها</span>
              <span className="text-xs text-slate-500">
                {complete ? "همه‌ی مؤلفه‌ها تکمیل شده‌اند" : "برای ثبت، هر پنج مؤلفه لازم است"}
              </span>
            </div>
            <p className="mt-2 text-lg font-extrabold text-slate-800" dir="ltr">
              {summary ?? `— ${GRBAS_COMPONENTS.map((component) => `${component.key}?`).join(" ")}`}
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">{GRBAS_NO_TOTAL_NOTE}</p>
          </section>

          {error ? (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goPrevious}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              مرحله‌ی قبل
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!complete || saving}
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {saving ? "در حال ثبت…" : "ثبت ارزیابی"}
            </button>
            <Link href="/panel" className="text-sm text-slate-500 hover:text-brand-600">
              انصراف
            </Link>
          </div>
          <p className="text-xs leading-6 text-slate-500">
            با ثبت، یک رکورد جدید در پرونده‌ی مراجع ساخته می‌شود؛ ارزیابی‌های قبلی بازنویسی نمی‌شوند.
            حداکثر امتیاز هر مؤلفه {toPersianDigits(GRBAS_MAX_SCORE)} است.
          </p>
        </div>
      ) : null}
    </div>
  );
}
