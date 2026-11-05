import type { Metadata } from "next";
import Link from "next/link";
import { requireClinician } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CLINICIAN_KIND, displayName } from "@/lib/clinicians";
import { REFERRAL_STATUS } from "@/lib/scheduling";
import { formatTehran } from "@/lib/tehran-time";
import { ageFrom } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { getTest } from "@/data/tests";
import { respondReferral } from "@/server/referral";

export const metadata: Metadata = { title: "ارجاع‌ها" };

const SEX: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default async function PanelReferrals() {
  const { profile } = await requireClinician();
  const include = { patient: true, fromClinician: { include: { user: true } } } as const;
  const [direct, pool, handled] = await Promise.all([
    db.referral.findMany({ where: { toClinicianId: profile.id, status: "NEW" }, include, orderBy: { createdAt: "asc" } }),
    db.referral.findMany({
      where: { toClinicianId: null, status: "NEW", preferredKind: { in: ["ANY", profile.kind] }, patientId: { not: profile.userId } },
      include,
      orderBy: { createdAt: "asc" },
    }),
    db.referral.findMany({
      where: { OR: [{ toClinicianId: profile.id, status: { not: "NEW" } }, { fromClinicianId: profile.id }] },
      include: { ...include, toClinician: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);
  const resultIds = [...direct, ...pool].map((r) => r.resultId).filter((x): x is string => Boolean(x));
  const results = new Map((await db.testResult.findMany({ where: { id: { in: resultIds } } })).map((r) => [r.id, r]));

  const card = (r: (typeof direct)[number], isPool: boolean) => {
    const res = r.resultId ? results.get(r.resultId) : undefined;
    const test = res ? getTest(res.testSlug) : undefined;
    const age = r.patient.birthDate ? ageFrom(r.patient.birthDate) : null;
    return (
      <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">
            {isPool ? "مراجع" : displayName(r.patient)}
            <span className="ms-2 text-sm font-normal text-slate-500">
              {[age != null ? `${toPersianDigits(age)} ساله` : null, r.patient.sex ? SEX[r.patient.sex] : null].filter(Boolean).join(" · ")}
            </span>
          </p>
          <span className="text-xs text-slate-400">{formatTehran(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
        {r.fromClinician && (
          <p className="mt-1 text-xs text-slate-500">
            ارجاع از: {r.fromClinician.title} {displayName(r.fromClinician.user)}
          </p>
        )}
        <p className="mt-3 text-sm leading-7 text-slate-700">{r.reason}</p>
        {test && <p className="mt-2 text-xs text-brand-700">پیوست: نتیجه‌ی {test.title} ({test.code})</p>}
        <form action={respondReferral} className="mt-4 flex flex-wrap gap-2 text-sm">
          <input type="hidden" name="id" value={r.id} />
          <input name="note" placeholder="پیام به مراجع (اختیاری)" className="min-w-48 flex-1 rounded-xl border border-slate-200 px-3 py-2" />
          <button name="decision" value="ACCEPTED" className="rounded-xl bg-emerald-600 px-4 py-2 text-white">پذیرش</button>
          {!isPool && (
            <button name="decision" value="DECLINED" className="rounded-xl border border-rose-200 px-4 py-2 text-rose-700">رد</button>
          )}
        </form>
      </div>
    );
  };

  return (
    <>
      <h1 className="text-xl font-extrabold">ارجاع‌های مستقیم به شما ({toPersianDigits(direct.length)})</h1>
      <div className="mt-4 space-y-3">
        {direct.length === 0 ? <p className="text-sm text-slate-500">ارجاع جدیدی ندارید.</p> : direct.map((r) => card(r, false))}
      </div>

      <h2 className="mt-10 text-lg font-extrabold">درخواست‌های عمومی مشاوره ({toPersianDigits(pool.length)})</h2>
      <p className="mt-1 text-sm text-slate-500">
        مراجعانی که دنبال {CLINICIAN_KIND[profile.kind]} هستند. با پذیرش، پرونده‌ی مراجع با شما به اشتراک گذاشته می‌شود و او می‌تواند با شما نوبت بگیرد.
      </p>
      <div className="mt-4 space-y-3">
        {pool.length === 0 ? <p className="text-sm text-slate-500">درخواست بازی وجود ندارد.</p> : pool.map((r) => card(r, true))}
      </div>

      {handled.length > 0 && (
        <>
          <h2 className="mt-10 font-bold">سابقه‌ی ارجاع‌ها</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {handled.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 first:border-0">
                    <td className="p-3">
                      <Link href={`/panel/patients/${r.patientId}`} className="hover:text-brand-600">{displayName(r.patient)}</Link>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {r.fromClinicianId === profile.id
                        ? `ارجاع شما به ${r.toClinician?.title ?? ""} ${r.toClinician ? displayName(r.toClinician.user) : ""}`
                        : "ارجاع به شما"}
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${REFERRAL_STATUS[r.status].style}`}>{REFERRAL_STATUS[r.status].label}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">{formatTehran(r.updatedAt, { dateStyle: "medium" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
