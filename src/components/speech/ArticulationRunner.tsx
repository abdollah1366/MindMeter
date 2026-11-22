"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { ARTICULATION_ERROR_LABELS, ARTICULATION_ERROR_TYPES, ARTICULATION_ITEMS, type ArticulationErrorType } from "@/lib/speech/articulation-types";
import { saveArticulationAssessment } from "@/server/articulation";

export type ArticulationPatientOption = { id: string; name: string; age: number | null; sex: string | null };

type Props = { patients: ArticulationPatientOption[]; initialPatientId?: string };

const SEX_LABEL: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default function ArticulationRunner({ patients, initialPatientId }: Props) {
  const router = useRouter();
  const fallback = patients.find((p) => p.id === initialPatientId)?.id ?? patients[0]?.id ?? "";
  const [patientId, setPatientId] = useState(fallback);
  const [results, setResults] = useState<Record<string, ArticulationErrorType>>(() =>
    Object.fromEntries(ARTICULATION_ITEMS.map((item) => [item.id, "NOT_TESTED" as ArticulationErrorType])),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;
  const testedCount = Object.values(results).filter((r) => r !== "NOT_TESTED").length;
  const correctCount = Object.values(results).filter((r) => r === "CORRECT").length;

  function setResult(id: string, value: ArticulationErrorType) {
    setResults((prev) => ({ ...prev, [id]: value }));
    setError("");
  }

  async function submit() {
    if (saving) return;
    if (!selectedPatient) { setError("لطفاً پرونده‌ی مراجع را انتخاب کنید."); return; }
    if (testedCount === 0) { setError("حداقل یک واج باید ارزیابی شود."); return; }

    setSaving(true);
    setError("");
    try {
      const response = await saveArticulationAssessment({
        patientId: selectedPatient.id,
        items: ARTICULATION_ITEMS.map((item) => ({ id: item.id, phoneme: item.phoneme, word: item.word, position: item.position, result: results[item.id] })),
        notes: notes.trim() || null,
        status: "FINAL",
      });
      if (response.ok) { router.push(`/speech/articulation/result/${response.id}`); router.refresh(); return; }
      setError(response.reason === "auth" ? "برای ثبت ارزیابی باید وارد شوید." : response.reason === "forbidden" ? "دسترسی به پرونده‌ی این مراجع مجاز نیست." : "اطلاعات ارزیابی معتبر نیست.");
    } catch {
      setError("ثبت ارزیابی ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 font-sans">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="art-patient" className="text-sm font-bold text-slate-700">مراجع</label>
        <p className="mt-1 text-xs text-slate-500">فقط مراجعانی که پرونده‌شان را با شما به اشتراک گذاشته‌اند.</p>
        <select id="art-patient" value={patientId} onChange={(e) => { setPatientId(e.target.value); setError(""); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.age !== null ? ` — ${toPersianDigits(p.age)} سال` : ""}{p.sex ? ` — ${SEX_LABEL[p.sex] ?? p.sex}` : ""}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">امتیازدهی واج‌ها</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          برای هر واج، نتیجه‌ی تولید در واژه‌ی نمونه را انتخاب کنید. «ارزیابی نشد» یعنی آن واج آزموده نشد.
        </p>
        <div className="mt-4 space-y-3">
          {ARTICULATION_ITEMS.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-slate-800">{item.phoneme}</span>
                  <span className="ms-2 text-xs text-slate-500">{item.word}</span>
                </div>
                <select value={results[item.id]} onChange={(e) => setResult(item.id, e.target.value as ArticulationErrorType)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500">
                  {ARTICULATION_ERROR_TYPES.map((t) => <option key={t} value={t}>{ARTICULATION_ERROR_LABELS[t]}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="art-notes" className="text-sm font-bold text-slate-700">توضیحات ارزیاب (اختیاری)</label>
        <textarea id="art-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-bold text-slate-700">پیش‌نمایش</span>
          <span className="text-xs text-slate-500">{toPersianDigits(testedCount)} ارزیابی‌شده — {toPersianDigits(correctCount)} صحیح</span>
        </div>
      </section>

      {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={saving || !selectedPatient} className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300">
          {saving ? "در حال ثبت…" : "ثبت ارزیابی"}
        </button>
        <Link href="/panel" className="text-sm text-slate-500 hover:text-brand-600">انصراف</Link>
      </div>
    </div>
  );
}
