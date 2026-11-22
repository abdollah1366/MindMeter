"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { SSI4_CONCOMITANTS, SSI4_SEVERITY_LABELS } from "@/lib/speech/ssi-4-types";
import { saveSsi4Assessment } from "@/server/ssi-4";

export type Ssi4PatientOption = { id: string; name: string; age: number | null; sex: string | null };

type Props = { patients: Ssi4PatientOption[]; initialPatientId?: string };

const SEX_LABEL: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default function Ssi4Runner({ patients, initialPatientId }: Props) {
  const router = useRouter();
  const fallback = patients.find((p) => p.id === initialPatientId)?.id ?? patients[0]?.id ?? "";
  const [patientId, setPatientId] = useState(fallback);
  const [frequencyPercent, setFrequencyPercent] = useState("0");
  const [longestDuration, setLongestDuration] = useState("0");
  const [concomitants, setConcomitants] = useState<Record<string, number>>(() => Object.fromEntries(SSI4_CONCOMITANTS.map((c) => [c.id, 0])));
  const [overallSeverity, setOverallSeverity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;

  async function submit() {
    if (saving) return;
    if (!selectedPatient) { setError("لطفاً پرونده‌ی مراجع را انتخاب کنید."); return; }
    const fp = Number(frequencyPercent);
    const ld = Number(longestDuration);
    if (!Number.isInteger(fp) || fp < 0 || fp > 100) { setError("درصد فراوانی باید ۰ تا ۱۰۰ باشد."); return; }
    if (isNaN(ld) || ld < 0 || ld > 60) { setError("مدت باید ۰ تا ۶۰ ثانیه باشد."); return; }
    setSaving(true); setError("");
    try {
      const response = await saveSsi4Assessment({
        patientId: selectedPatient.id,
        frequencyPercent: fp,
        longestDurationSec: ld,
        concomitants: SSI4_CONCOMITANTS.map((c) => ({ id: c.id, label: c.label, score: concomitants[c.id] })),
        overallSeverity,
        notes: notes.trim() || null,
        status: "FINAL",
      });
      if (response.ok) { router.push(`/speech/ssi-4/result/${response.id}`); router.refresh(); return; }
      setError(response.reason === "auth" ? "برای ثبت ارزیابی باید وارد شوید." : response.reason === "forbidden" ? "دسترسی به پرونده‌ی این مراجع مجاز نیست." : "اطلاعات ارزیابی معتبر نیست.");
    } catch { setError("ثبت ارزیابی ناموفق بود."); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 font-sans">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="ssi4-patient" className="text-sm font-bold text-slate-700">مراجع</label>
        <p className="mt-1 text-xs text-slate-500">فقط مراجعانی که پرونده‌شان را با شما به اشتراک گذاشته‌اند.</p>
        <select id="ssi4-patient" value={patientId} onChange={(e) => { setPatientId(e.target.value); setError(""); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.age !== null ? ` — ${toPersianDigits(p.age)} سال` : ""}{p.sex ? ` — ${SEX_LABEL[p.sex] ?? p.sex}` : ""}</option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">شاخص‌های لکنت</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">فراوانی لکنت (%)</span>
            <input type="number" min={0} max={100} value={frequencyPercent} onChange={(e) => setFrequencyPercent(e.target.value)} className="mt-2 w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">طولانی‌ترین لکنت (ثانیه)</span>
            <input type="number" min={0} max={60} step="0.1" value={longestDuration} onChange={(e) => setLongestDuration(e.target.value)} className="mt-2 w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">رفتارهای همراه (۰ تا ۵)</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">برای هر رفتار، شدت را از ۰ (ندارد) تا ۵ (شدید) انتخاب کنید.</p>
        <div className="mt-4 space-y-3">
          {SSI4_CONCOMITANTS.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-slate-800">{c.label}</span>
                  <p className="text-xs text-slate-500">{c.description}</p>
                </div>
                <select value={concomitants[c.id]} onChange={(e) => setConcomitants((p) => ({ ...p, [c.id]: Number(e.target.value) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500">
                  {[0, 1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label className="text-sm font-bold text-slate-700">شدت کلی (نظر ارزیاب)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setOverallSeverity(s)} className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${overallSeverity === s ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
              {s} — {SSI4_SEVERITY_LABELS[["VERY_MILD", "MILD", "MODERATE", "SEVERE", "VERY_SEVERE"][s - 1] as keyof typeof SSI4_SEVERITY_LABELS]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="ssi4-notes" className="text-sm font-bold text-slate-700">توضیحات ارزیاب (اختیاری)</label>
        <textarea id="ssi4-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500" />
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
