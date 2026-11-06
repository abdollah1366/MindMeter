import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasAccess, requireClinician } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { ageFrom, formatJalali } from "@/lib/jalali";
import { levelStyle } from "@/lib/levels";
import { toPersianDigits } from "@/lib/scoring";
import type { ScaleScore, TestAlert } from "@/lib/types";
import { getTest } from "@/data/tests";
import { addClinicalNote } from "@/server/clinician";
import { referToClinician } from "@/server/referral";
import { CLINICIAN_KIND } from "@/lib/clinicians";
import { audit } from "@/lib/audit";

export const metadata: Metadata = { title: "پرونده‌ی مراجع", robots: { index: false } };

const SEX: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireClinician();
  if (!(await hasAccess(profile.id, id))) notFound();
  await audit(profile.userId, "record.view", { targetType: "User", targetId: id, patientId: id });

  const patient = await db.user.findUnique({
    where: { id },
    include: { results: { orderBy: { createdAt: "desc" } } },
  });
  if (!patient) notFound();
  const notes = await db.clinicalNote.findMany({
    where: { clinicianId: profile.id, patientId: id },
    orderBy: { createdAt: "desc" },
  });
  const colleagues = await db.clinicianProfile.findMany({
    where: { status: "APPROVED", id: { not: profile.id }, userId: { not: id } },
    include: { user: true },
  });

  const info = [
    ["کد ملی", patient.nationalId ? toPersianDigits(patient.nationalId) : "-"],
    ["سن", patient.birthDate ? `${toPersianDigits(ageFrom(patient.birthDate))} سال` : "-"],
    ["جنسیت", patient.sex ? SEX[patient.sex] : "-"],
    ["موبایل", toPersianDigits(patient.phone)],
    ["تحصیلات", patient.education ?? "-"],
    ["شهر", patient.city ?? "-"],
  ];

  return (
    <>
      <Link href="/panel" className="text-sm text-slate-400 hover:text-brand-600">→ همه‌ی مراجعان</Link>
      <h1 className="mt-3 text-2xl font-extrabold">{displayName(patient)}</h1>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {info.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white p-3">
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="text-lg font-extrabold">تاریخچه‌ی تست‌ها</h2>
          {patient.results.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">مراجع هنوز تستی انجام نداده است.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {patient.results.map((r) => {
                const scores = JSON.parse(r.scores) as ScaleScore[];
                const alerts = JSON.parse(r.alerts) as TestAlert[];
                const t = getTest(r.testSlug);
                return (
                  <li key={r.id}>
                    <Link href={`/reports/${r.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-400">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold">
                          {t?.code} <span className="text-sm font-normal text-slate-500">{t?.title}</span>
                        </p>
                        <span className="text-xs text-slate-400">{formatJalali(r.createdAt)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {alerts.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">⚠ هشدار ایمنی</span>}
                        {scores.map((s) => (
                          <span key={s.key} className={`rounded-full border px-2.5 py-0.5 text-xs ${levelStyle(s.result?.level).badge}`}>
                            {scores.length > 1 ? `${s.title}: ` : ""}
                            {s.result?.title} ({toPersianDigits(s.score)})
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-extrabold">یادداشت‌های بالینی</h2>
          <p className="mt-1 text-xs text-slate-400">فقط برای شما قابل مشاهده است.</p>
          <form action={addClinicalNote} className="mt-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <textarea name="body" required rows={4} maxLength={5000} placeholder="یادداشت جدید…" className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500" />
            <button className="mt-2 rounded-xl bg-brand-600 px-5 py-2 text-sm text-white hover:bg-brand-700">ثبت یادداشت</button>
          </form>
          <ul className="mt-4 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-white p-3 text-sm">
                <p className="text-xs text-slate-400">{formatJalali(n.createdAt)}</p>
                <p className="mt-1 whitespace-pre-line leading-7">{n.body}</p>
              </li>
            ))}
          </ul>
          {colleagues.length > 0 && (
            <form action={referToClinician} className="mt-6 rounded-2xl border border-calm-100 bg-calm-50 p-4">
              <h3 className="text-sm font-bold text-calm-700">ارجاع به متخصص دیگر</h3>
              <input type="hidden" name="patientId" value={patient.id} />
              <select name="toClinicianId" className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {displayName(c.user)} ({CLINICIAN_KIND[c.kind]} · {c.specialty})
                  </option>
                ))}
              </select>
              <textarea name="reason" required minLength={5} rows={2} placeholder="دلیل ارجاع" className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" />
              <button className="mt-2 rounded-xl bg-calm-600 px-5 py-2 text-sm text-white">ارسال ارجاع</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
