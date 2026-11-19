import type { Metadata } from "next";
import Link from "next/link";
import { requireClinician } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { getRunnableTests } from "@/lib/tests-service";
import { getTest } from "@/data/tests";
import { formatJalali } from "@/lib/jalali";
import { formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";
import {
  CLINICIAN_PLAN_LIST,
  planCountsLabel,
  planRemaining,
  planStatusLabel,
  planStatusStyle,
  planTitle,
  planUsable,
  sortPlansForUse,
} from "@/lib/clinician-plans";
import { buyClinicianPlan } from "@/server/clinician-plans";
import { startClinicianTest } from "@/server/clinician-tests";

export const metadata: Metadata = { title: "تست‌های مراجعان", robots: { index: false } };

export default async function PanelTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string; nocredit?: string; patient?: string }>;
}) {
  const { profile } = await requireClinician();
  const { purchased, nocredit, patient } = await searchParams;

  const [plans, grants, tests, runs] = await Promise.all([
    db.clinicianTestPlan.findMany({ where: { clinicianId: profile.id }, orderBy: { createdAt: "desc" } }),
    db.accessGrant.findMany({ where: { clinicianId: profile.id, revokedAt: null }, include: { patient: true }, orderBy: { createdAt: "desc" } }),
    getRunnableTests(),
    db.clinicianTestRun.findMany({
      where: { clinicianId: profile.id, status: "DONE" },
      include: { patient: true, result: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const usable = sortPlansForUse(plans).filter((p) => planUsable(p));
  const unlimited = usable.some((p) => p.totalTests === null);
  const remaining = unlimited ? null : usable.reduce((sum, p) => sum + (planRemaining(p) ?? 0), 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = runs.filter((r) => r.status === "DONE" && r.completedAt && r.completedAt >= monthStart).length;
  const hasCredit = usable.length > 0;
  const sortedTests = [...tests].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">تست‌های مراجعان</h1>
          <p className="mt-1 text-sm text-slate-500">تست را برای مراجع انتخاب و اجرا کنید؛ نتیجه مستقیم در پرونده‌ی او ذخیره می‌شود.</p>
        </div>
        <Link href="/panel" className="text-sm text-slate-400 hover:text-brand-600">→ مراجعان</Link>
      </div>

      {purchased && (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ پرداخت شما ثبت شد و بسته‌ی تست فعال گردید. اکنون می‌توانید تست را برای مراجعان اجرا کنید.
        </p>
      )}
      {nocredit && (
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          برای اجرای تست، ابتدا یکی از بسته‌های زیر را تهیه کنید.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="اعتبار باقی‌مانده" value={unlimited ? "نامحدود" : toPersianDigits(remaining ?? 0)} hint={unlimited ? "اشتراک یکساله فعال" : "تست قابل اجرا"} />
        <Stat label="اجرا در این ماه" value={toPersianDigits(thisMonth)} hint="تست برای مراجعان" />
        <Stat label="مراجعان دارای دسترسی" value={toPersianDigits(grants.length)} hint="پرونده‌ی به‌اشتراک‌گذاشته" />
      </div>

      {!hasCredit && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
          در حال حاضر اعتبار تست فعالی ندارید. با خرید یکی از بسته‌های زیر می‌توانید بلافاصله تست اجرا کنید.
        </p>
      )}
      {hasCredit && remaining !== null && remaining <= 5 && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
          فقط {toPersianDigits(remaining)} تست از اعتبار شما باقی مانده است. برای جلوگیری از وقفه در کار، بسته‌ی جدید تهیه کنید.
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">اجرای تست برای مراجع</h2>
        {grants.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-sm leading-7 text-slate-500">
            هنوز مراجعی پرونده‌اش را با شما به اشتراک نگذاشته است. مراجعان از صفحه‌ی پروفایل عمومی شما می‌توانند دسترسی بدهند.
          </p>
        ) : !hasCredit ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            پس از خرید بسته‌ی تست، فرم اجرای تست در همین‌جا فعال می‌شود.
          </p>
        ) : (
          <form action={startClinicianTest} className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label>
              <span className="text-sm text-slate-600">مراجع *</span>
              <select name="patientId" required defaultValue={patient && grants.some((g) => g.patient.id === patient) ? patient : ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <option value="">انتخاب مراجع</option>
                {grants.map((g) => (
                  <option key={g.patient.id} value={g.patient.id}>
                    {displayName(g.patient)}{g.patient.phone ? ` — ${toPersianDigits(g.patient.phone)}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm text-slate-600">تست *</span>
              <select name="testSlug" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <option value="">انتخاب تست</option>
                {sortedTests.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.code} — {t.title}</option>
                ))}
              </select>
            </label>
            <button className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700">شروع تست</button>
          </form>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">بسته‌های اعتبار تست</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {CLINICIAN_PLAN_LIST.map((def) => (
            <div
              key={def.kind}
              className={`flex flex-col rounded-2xl border bg-white p-5 ${def.featured ? "border-brand-400 shadow-sm" : "border-slate-200"}`}
            >
              {def.featured && <span className="mb-2 w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">پیشنهاد ویژه</span>}
              <h3 className="font-extrabold">{def.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{def.subtitle}</p>
              <p className="mt-3 text-xl font-extrabold text-brand-700">{formatToman(def.amount)}</p>
              <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-600">
                {def.perks.map((perk) => (
                  <li key={perk}>✓ {perk}</li>
                ))}
              </ul>
              <form action={buyClinicianPlan} className="mt-4">
                <input type="hidden" name="kind" value={def.kind} />
                <button className="w-full rounded-xl bg-brand-600 py-2.5 font-bold text-white hover:bg-brand-700">خرید بسته</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">بسته‌های من</h2>
        {plans.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">هنوز بسته‌ای خریداری نکرده‌اید.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-surface text-slate-500">
                <tr>
                  <th className="p-3 text-start">بسته</th>
                  <th className="p-3 text-start">تعداد</th>
                  <th className="p-3 text-start">مصرف‌شده</th>
                  <th className="p-3 text-start">وضعیت</th>
                  <th className="p-3 text-start">اعتبار تا</th>
                  <th className="p-3 text-start">تاریخ خرید</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium">{planTitle(p.kind)}</td>
                    <td className="p-3">{planCountsLabel(p)}</td>
                    <td className="p-3">{toPersianDigits(p.usedTests)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs ${planStatusStyle(p.status)}`}>{planStatusLabel(p.status)}</span>
                    </td>
                    <td className="p-3 text-slate-600">{p.expiresAt ? formatJalali(p.expiresAt) : "بدون انقضا"}</td>
                    <td className="p-3 text-slate-500">{formatJalali(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">آخرین اجراها</h2>
        {runs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">هنوز تستی برای مراجعان اجرا نکرده‌اید.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {runs.map((r) => {
              const test = getTest(r.testSlug);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="font-bold">
                      {test?.code ?? r.testSlug} <span className="text-sm font-normal text-slate-500">{test?.title}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      مراجع: {displayName(r.patient)} · {formatJalali(r.completedAt ?? r.createdAt)}
                    </p>
                  </div>
                  {r.resultId ? (
                    <Link href={`/reports/${r.resultId}`} className="rounded-xl bg-brand-50 px-4 py-2 text-sm text-brand-700 hover:bg-brand-100">
                      مشاهده‌ی گزارش
                    </Link>
                  ) : (
                    <span className="text-xs text-amber-700">در حال اجرا / نیمه‌کاره</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-brand-700">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}
