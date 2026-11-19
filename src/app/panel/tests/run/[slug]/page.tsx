import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasAccess, requireClinician } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { getVisibleTest } from "@/lib/tests-service";
import TestRunner from "@/components/TestRunner";
import StroopRunner from "@/components/StroopRunner";
import D2Runner from "@/components/D2Runner";

export const metadata: Metadata = { title: "اجرای تست برای مراجع", robots: { index: false } };

export default async function ClinicianRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { slug } = await params;
  const { run: runId } = await searchParams;
  const { profile } = await requireClinician();
  if (!runId) notFound();

  const run = await db.clinicianTestRun.findUnique({ where: { id: runId }, include: { patient: true } });
  if (!run || run.clinicianId !== profile.id || run.testSlug !== slug) notFound();
  if (run.resultId) redirect(`/reports/${run.resultId}`);
  if (!(await hasAccess(profile.id, run.patientId))) notFound();

  const test = await getVisibleTest(slug);
  if (!test) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-brand-50 to-calm-50 p-4">
        <div>
          <p className="text-xs text-slate-500">اجرای تست برای مراجع</p>
          <p className="text-lg font-extrabold">{displayName(run.patient)}</p>
        </div>
        <Link href="/panel/tests" className="text-sm text-slate-500 hover:text-brand-600">→ بازگشت به پنل تست‌ها</Link>
      </div>
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-extrabold">{test.title}</h1>
        <p dir="ltr" className="mt-1 text-end text-xs text-slate-400">{test.englishTitle}</p>
      </div>
      {test.report === "stroop" ? (
        <StroopRunner test={test} run={{ runId: run.id, patientName: displayName(run.patient) }} />
      ) : test.report === "d2" ? (
        <D2Runner test={test} run={{ runId: run.id, patientName: displayName(run.patient) }} />
      ) : (
        <TestRunner test={test} run={{ runId: run.id, patientName: displayName(run.patient) }} />
      )}
    </div>
  );
}
