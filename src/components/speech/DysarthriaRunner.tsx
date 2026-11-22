"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toPersianDigits } from "@/lib/scoring";
import { DYSARTHRIA_DOMAINS, DYSARTHRIA_SCALE, DYSARTHRIA_SEVERITY_LABELS } from "@/lib/speech/dysarthria-types";
import { saveDysarthriaAssessment } from "@/server/dysarthria";

export type DysarthriaPatientOption = { id: string; name: string; age: number | null; sex: string | null };

type Props = { patients: DysarthriaPatientOption[]; initialPatientId?: string };

const SEX_LABEL: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default function DysarthriaRunner({ patients, initialPatientId }: Props) {
  const router = useRouter();
  const fallback = patients.find((p) => p.id === initialPatientId)?.id ?? patients[0]?.id ?? "";
  const [patientId, setPatientId] = useState(fallback);
  const [ratings, setRatings] = useState<Record<string, number>>(() => Object.fromEntries(DYSARTHRIA_DOMAINS.map((d) => [d.id, 0])));
  const [overallSeverity, setOverallSeverity] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPatient = patients.find((p) => p.id === patientId) ?? null;

  async function submit() {
    if (saving) return;
    if (!selectedPatient) { setError("لطفاً پرونده‌ی مراجع را انتخاب کنید."); return; }
    setSaving(true); setError("");
    try {
      const response = await saveDysarthriaAssessment({
        patientId: selectedPatient.id,
        ratings: DYSARTHRIA_DOMAINS.map((d) => ({ id: d.id, domain: d.domain, label: d.label, score: ratings[d.id] })),
        overallSeverity,
        notes: notes.trim() || null,
        status: "FINAL",
      });
      if (response.ok) { router.push(`/speech/dysarthria/result/${response.id}`); router.refresh(); return; }
      setError(response.reason === "auth" ? "برای ثبت ارزیابی باید وارد شوید." : response.reason === "forbidden" ? "دسترسی به پرونده‌ی این مراجع مجاز نیست." : "اطلاعات ارزیابی معتبر نیست.");
    } catch { setError("ثبت ارزیابی ناموفق بود."); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 font-sans">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="dys-patient" className="text-sm font-bold text-slate-700">مراجع</label>
        <p className="mt-1 text-xs text-slate-500">فقط مراجعانی که پرونده‌شان را با شما به اشتراک گذاشته‌اند.</p>
        <select id="dys-patient" value={patientId} onChange={(e) => { setPatientId(e.target.value); setError(""); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.age !== null ? ` — ${toPersianDigits(p.age)} سال` : ""}{p.sex ? ` — ${SEX_LABEL[p.sex] ?? p.sex}` : ""}</option>
          ))}
        </select>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">امتیازدهی دامنه‌ها</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">برای هر دامنه، شدت اختلال را از ۰ (طبیعی) تا ۴ (بسیار شدید) انتخاب کنید.</p>
        <div className="mt-4 space-y-3">
          {DYSARTHRIA_DOMAINS.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-slate-800">{d.label}</span>
                  <p className="text-xs text-slate-500">{d.description}</p>
                </div>
                <select value={ratings[d.id]} onChange={(e) => setRatings((p) => ({ ...p, [d.id]: Number(e.target.value) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500">
                  {DYSARTHRIA_SCALE.map((s) => <option key={s.score} value={s.score}>{s.score} — {s.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label className="text-sm font-bold text-slate-700">شدت کلی (نظر ارزیاب)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {DYSARTHRIA_SCALE.map((s) => (
            <button key={s.score} type="button" onClick={() => setOverallSeverity(s.score)} className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${overallSeverity === s.score ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
              {s.score} — {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <label htmlFor="dys-notes" className="text-sm font-bold text-slate-700">توضیحات ارزیاب (اختیاری)</label>
        <textarea id="dys-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500" />
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
