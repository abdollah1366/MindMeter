import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CLINICIAN_KIND, displayName } from "@/lib/clinicians";
import { REFERRAL_STATUS } from "@/lib/scheduling";
import { formatTehran } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "ارجاع‌ها" };

export default async function AdminReferrals() {
  const referrals = await db.referral.findMany({
    include: { patient: true, fromClinician: { include: { user: true } }, toClinician: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const open = referrals.filter((r) => r.status === "NEW");
  const stale = open.filter((r) => Date.now() - r.createdAt.getTime() > 48 * 3600_000);

  return (
    <>
      <h1 className="text-2xl font-extrabold">ارجاع‌ها و درخواست‌های مشاوره</h1>
      <p className="mt-2 text-sm text-slate-500">
        {toPersianDigits(open.length)} درخواست در انتظار پذیرش
        {stale.length > 0 && <span className="text-rose-600"> · {toPersianDigits(stale.length)} مورد بیش از ۴۸ ساعت بی‌پاسخ مانده</span>}
      </p>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-slate-500">
            <tr>
              <th className="p-3 text-start">تاریخ</th>
              <th className="p-3 text-start">مراجع</th>
              <th className="p-3 text-start">از</th>
              <th className="p-3 text-start">به</th>
              <th className="p-3 text-start">دلیل</th>
              <th className="p-3 text-start">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {referrals.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">ارجاعی ثبت نشده است.</td></tr>
            )}
            {referrals.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="p-3 whitespace-nowrap">{formatTehran(r.createdAt, { dateStyle: "medium" })}</td>
                <td className="p-3">{displayName(r.patient)}</td>
                <td className="p-3">{r.fromClinician ? `${r.fromClinician.title ?? ""} ${displayName(r.fromClinician.user)}` : "خود مراجع"}</td>
                <td className="p-3">
                  {r.toClinician
                    ? `${r.toClinician.title ?? ""} ${displayName(r.toClinician.user)}`
                    : `صف عمومی (${r.preferredKind === "ANY" ? "هر متخصص" : CLINICIAN_KIND[r.preferredKind]})`}
                </td>
                <td className="max-w-xs p-3 text-xs leading-6 text-slate-600">{r.reason}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${REFERRAL_STATUS[r.status].style}`}>{REFERRAL_STATUS[r.status].label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
