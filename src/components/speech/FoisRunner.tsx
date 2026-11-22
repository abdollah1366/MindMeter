"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { FOIS_LEVELS } from "@/lib/speech/fois-types";
import { saveFoisAssessment } from "@/server/fois";

export type FoisPatientOption = { id: string; name: string; age: number | null; sex: string | null };

type Props = { patients: FoisPatientOption[]; initialPatientId?: string };

const SEX_LABEL: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default function FoisRunner({ patients, initialPatientId }: Props) {
  const router = useRouter();
  const fallback = patients.find((p) => p.id === initialPatientId)?.id ?? patients[0]?.id ?? "";
  const [patientId, setPatientId] = useState(fallback);
  const [level, setLevel] = useState<number>(7);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;

  async function submit() {
    if (saving) return;
    if (!selectedPatient) { setError("لطفاً پرونده‌ی مراجع را انتخاب کنید."); return; }
    setSaving(true); setError("");
    try {
      const response = await saveFoisAssessment({ patientId: selectedPatient.id, level, notes: notes.trim() || null, status: "FINAL" });
      if (response.ok) { router.push(`/speech/fois/result/${response.id}`); router.refresh(); return; }
      setError(response.reason === "auth" ? "برای ثبت ارزیابی باید وارد شوید." : response.reason === "forbidden" ? "دسترسی به پرونده‌ی این مراجع مجاز نیست." : "اطلاعات ارزیابی معتبر نیست.");
    } catch { setError("ثبت ارزیابی ناموفق بود."); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 font-sans">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="fois-patient" className="text-sm font-bold text-slate-700">مراجع</label>
        <p className="mt-1 text-xs text-slate-500">فقط مراجعانی که پرونده‌شان را با شما به اشتراک گذاشته‌اند.</p>
        <select id="fois-patient" value={patientId} onChange={(e) => { setPatientId(e.target.value); setError(""); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.age !== null ? ` — ${toPersianDigits(p.age)} سال` : ""}{p.sex ? ` — ${SEX_LABEL[p.sex] ?? p.sex}` : ""}</option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">سطح عملکرد بلع (FOIS)</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">سطح فعلی دریافت خوراکی از دهان را انتخاب کنید.</p>
        <div className="mt-4 space-y-2">
          {FOIS_LEVELS.map((l) => (
            <label key={l.level} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${level === l.level ? "border-brand-500 bg-brand-50 font-bold text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
              <input type="radio" name="fois-level" value={l.level} checked={level === l.level} onChange={() => setLevel(l.level)} className="h-4 w-4 accent-brand-600" />
              <span className="flex items-center gap-2">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs" dir="ltr">{l.level}</span>
                <span>{l.label}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="fois-notes" className="text-sm font-bold text-slate-700">توضیحات ارزیاب (اختیاری)</label>
        <textarea id="fois-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500" />
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
