import type { Metadata } from "next";
import Link from "next/link";
import MyResults from "@/components/MyResults";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getTest } from "@/data/tests";
import { formatJalali } from "@/lib/jalali";
import { levelStyle } from "@/lib/levels";
import type { ScaleScore } from "@/lib/types";
import { logout } from "@/server/auth";
import { revokeAccess } from "@/server/clinician";
import { displayName } from "@/lib/clinicians";
import { AUDIT_LABEL } from "@/lib/audit";
import { formatTehran } from "@/lib/tehran-time";

export const metadata: Metadata = { title: "پرونده‌ی من" };

export default async function MyResultsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <h1 className="text-2xl font-extrabold">نتایج من</h1>
        <div className="mt-4 mb-6 rounded-2xl bg-calm-50 p-5 text-sm leading-7 text-calm-700">
          نتایج زیر فقط در همین مرورگر ذخیره شده‌اند.{" "}
          <Link href="/login?next=/my-results" className="font-bold underline">
            با شماره موبایل وارد شوید
          </Link>{" "}
          تا پرونده‌ی شما ساخته شود و بتوانید گزارش رسمی چاپ کنید.
        </div>
        <MyResults />
      </>
    );
  }

  const [results, grants, accessLog] = await Promise.all([
    db.testResult.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.accessGrant.findMany({
      where: { patientId: user.id, revokedAt: null },
      include: { clinician: { include: { user: { select: { firstName: true, lastName: true } } } } },
    }),
    db.auditLog.findMany({ where: { patientId: user.id, actorId: { not: user.id } }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const actors = new Map(
    (await db.user.findMany({ where: { id: { in: accessLog.map((a) => a.actorId).filter((x): x is string => Boolean(x)) } }, select: { id: true, firstName: true, lastName: true } })).map((u) => [u.id, u]),
  );
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">پرونده‌ی من</h1>
          {name && <p className="mt-1 text-slate-500">{name}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/appointments" className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            نوبت‌ها و ویزیت‌ها
          </Link>
          <Link href="/profile" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
            اطلاعات من
          </Link>
          <form action={logout}>
            <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">خروج</button>
          </form>
        </div>
      </div>

      {!isProfileComplete(user) && (
        <Link href="/profile" className="mt-5 block rounded-2xl bg-warm-100 p-4 text-sm text-warm-600">
          برای چاپ گزارش، اطلاعات شخصی خود را تکمیل کنید ←
        </Link>
      )}

      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          هنوز تستی در پرونده‌ی شما ثبت نشده است.{" "}
          <Link href="/tests" className="text-brand-600 hover:underline">اولین تست را شروع کنید</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {results.map((r) => {
            const test = getTest(r.testSlug);
            const scores = JSON.parse(r.scores) as ScaleScore[];
            return (
              <li key={r.id}>
                <Link
                  href={`/reports/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-400"
                >
                  <div>
                    <p className="font-bold">
                      {test?.title ?? r.testSlug} <span className="text-xs font-normal text-slate-400">({test?.code})</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatJalali(r.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scores.map((s) => (
                      <span key={s.key} className={`rounded-full border px-2.5 py-0.5 text-xs ${levelStyle(s.result?.level).badge}`}>
                        {scores.length > 1 ? `${s.title}: ` : ""}
                        {s.result?.title}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-extrabold">متخصصانی که به پرونده‌ی شما دسترسی دارند</h2>
          <Link href="/clinicians" className="text-sm text-brand-600 hover:underline">فهرست متخصصان ←</Link>
        </div>
        {grants.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">پرونده‌ی شما با هیچ متخصصی به اشتراک گذاشته نشده است.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {grants.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <Link href={`/clinicians/${g.clinicianId}`} className="font-medium hover:text-brand-600">
                  {g.clinician.title} {displayName(g.clinician.user)} <span className="text-xs text-slate-400">· {g.clinician.specialty}</span>
                </Link>
                <form action={revokeAccess}>
                  <input type="hidden" name="clinicianId" value={g.clinicianId} />
                  <button className="text-sm text-rose-600 hover:underline">لغو دسترسی</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-extrabold">چه کسانی پرونده‌ی شما را دیده‌اند</h2>
        <p className="mt-1 text-xs text-slate-500">هر بار متخصصی پرونده یا گزارش شما را باز کند یا یادداشتی ثبت کند، اینجا نمایش داده می‌شود.</p>
        {accessLog.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">هنوز کسی پرونده‌ی شما را مشاهده نکرده است.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm">
            {accessLog.map((a) => {
              const actor = a.actorId ? actors.get(a.actorId) : null;
              return (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 p-3">
                  <span>
                    <b>{actor ? displayName(actor) : "سیستم"}</b> · {AUDIT_LABEL[a.action] ?? a.action}
                  </span>
                  <span className="text-xs text-slate-400">{formatTehran(a.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
