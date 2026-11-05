import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import ResultNote from "@/components/ResultNote";
import NormPanel from "@/components/NormPanel";
import LevelBreakdown from "@/components/LevelBreakdown";
import { buildNormReport } from "@/lib/norms";
import PrintButton from "@/components/PrintButton";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getTest } from "@/data/tests";
import { ageFrom, formatJalali } from "@/lib/jalali";
import { SKIP_VALUE, optionsFor, toPersianDigits, type Answers } from "@/lib/scoring";
import type { ScaleScore, TestAlert } from "@/lib/types";

export const metadata: Metadata = { title: "گزارش نتیجه‌ی تست", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

const SEX_LABEL: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/reports/${id}`);

  const result = await db.testResult.findUnique({ where: { id }, include: { user: true } });
  if (!result) notFound();

  // دسترسی: صاحب پرونده، یا متخصص تأییدشده‌ای که بیمار به او اجازه داده است
  const isOwner = result.userId === user.id;
  if (!isOwner) {
    const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
    if (!profile || profile.status !== "APPROVED" || !(await hasAccess(profile.id, result.userId))) notFound();
  }
  const patient = result.user;
  if (isOwner && !isProfileComplete(patient)) redirect(`/profile?next=/reports/${id}`);

  const test = getTest(result.testSlug);
  if (!test) notFound();

  const answers = JSON.parse(result.answers) as Answers;
  const scores = JSON.parse(result.scores) as ScaleScore[];
  const alerts = JSON.parse(result.alerts) as TestAlert[];
  const norm = test.kind === "ability" ? await buildNormReport(result.id) : null;

  const info = [
    ["نام و نام خانوادگی", [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "-"],
    ["کد ملی", patient.nationalId ? toPersianDigits(patient.nationalId) : "-"],
    ["سن", patient.birthDate ? `${toPersianDigits(ageFrom(patient.birthDate))} سال` : "-"],
    ["جنسیت", patient.sex ? SEX_LABEL[patient.sex] ?? "-" : "-"],
    ["تاریخ تولد", patient.birthDate ? formatJalali(patient.birthDate) : "-"],
    ["تحصیلات", patient.education ?? "-"],
    ["شماره تماس", toPersianDigits(patient.phone)],
    ["تاریخ آزمون", formatJalali(result.createdAt)],
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={isOwner ? "/my-results" : `/panel/patients/${patient.id}`} className="text-sm text-slate-500 hover:text-brand-600">
          → بازگشت به پرونده
        </Link>
        <PrintButton />
      </div>

      <article className="print-area rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* سربرگ */}
        <header className="flex items-start justify-between border-b-2 border-brand-500 pb-4">
          <div>
            <p className="text-xl font-extrabold text-brand-700">مایندمتر</p>
            <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          </div>
          <div className="text-left text-xs leading-6 text-slate-500">
            <p>گزارش نتیجه‌ی آزمون روانشناختی</p>
            <p>
              شماره‌ی گزارش: <span dir="ltr" className="font-mono">{result.id.slice(-10).toUpperCase()}</span>
            </p>
          </div>
        </header>

        {/* مشخصات مراجع */}
        <section className="mt-5">
          <h2 className="mb-2 text-sm font-bold text-slate-500">مشخصات مراجع</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-2xl bg-surface p-4 text-sm">
            {info.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-200/70 pb-1">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* مشخصات آزمون */}
        <section className="mt-5">
          <h2 className="text-lg font-extrabold">
            {test.title} <span className="text-sm font-normal text-slate-500">({test.code} – {test.englishTitle})</span>
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            تعداد سؤال: {toPersianDigits(test.questions.length)} · {test.about}
          </p>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-sm font-bold text-slate-500">نتایج</h2>
          <ScoreBreakdown test={test} scores={scores} alerts={alerts} />
          {test.kind === "ability" && (
            <div className="mt-4">
              <LevelBreakdown test={test} answers={answers} />
            </div>
          )}
          {norm && (
            <div className="mt-4">
              <NormPanel report={norm} print />
            </div>
          )}
          {test.resultNote && (
            <div className="mt-4">
              <ResultNote note={test.resultNote} print />
            </div>
          )}
        </section>

        {/* پاسخ‌ها */}
        <section className="mt-6 break-before-auto">
          <h2 className="mb-2 text-sm font-bold text-slate-500">پاسخ‌های ثبت‌شده</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-1.5 text-start">#</th>
                <th className="py-1.5 text-start">سؤال</th>
                <th className="py-1.5 text-start">پاسخ</th>
              </tr>
            </thead>
            <tbody>
              {test.questions.map((q, i) => (
                <tr key={q.id} className="border-b border-slate-100 align-top">
                  <td className="py-1.5 pe-2 text-slate-400">{toPersianDigits(i + 1)}</td>
                  <td className="py-1.5 pe-3">{q.text}</td>
                  <td className="py-1.5 whitespace-nowrap">
                    {optionsFor(test, q).find((o) => o.value === answers[q.id])?.label ?? "-"}
                    {q.answer !== undefined && answers[q.id] !== SKIP_VALUE &&
                      (answers[q.id] === q.answer ? <span className="ms-1 text-emerald-600">✓</span> : <span className="ms-1 text-rose-500">✗</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-6 text-slate-500">
          <p>
            <b>توجه:</b> این گزارش نتیجه‌ی {test.kind === "ability" ? "یک آزمون کوتاه توانایی (بدون هنجار)" : "یک ابزار غربالگری خودگزارشی"} است و به‌تنهایی تشخیص بالینی محسوب نمی‌شود. تفسیر نهایی
            باید توسط روانشناس بالینی یا روانپزشک و همراه با مصاحبه‌ی بالینی انجام شود.
          </p>
          <p className="mt-1">منبع: {test.source.citation}</p>
          <div className="mt-6 grid grid-cols-2 gap-6 text-center text-slate-400">
            <div className="border-t border-dashed border-slate-300 pt-2">مهر و امضای متخصص</div>
            <div className="border-t border-dashed border-slate-300 pt-2">تاریخ بررسی</div>
          </div>
        </footer>
      </article>
    </div>
  );
}
