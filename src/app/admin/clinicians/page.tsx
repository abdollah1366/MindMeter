import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CLINICIAN_KIND, CLINICIAN_STATUS, displayName } from "@/lib/clinicians";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { reviewClinician } from "@/server/admin";
import Avatar from "@/components/Avatar";

export const metadata: Metadata = { title: "متخصصان" };

const ORDER: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

export default async function AdminClinicians() {
  const list = (await db.clinicianProfile.findMany({ include: { user: { include: { uploads: { where: { kind: "DOCUMENT" }, orderBy: { createdAt: "desc" } } } }, _count: { select: { grants: true } } } })).sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <>
      <h1 className="text-2xl font-extrabold">درخواست‌ها و متخصصان</h1>
      <p className="mt-2 text-sm text-slate-500">پیش از تأیید، شماره‌ی نظام را در سامانه‌ی سازمان نظام روانشناسی یا نظام پزشکی استعلام کنید.</p>
      {list.length === 0 && <p className="mt-6 text-sm text-slate-500">درخواستی ثبت نشده است.</p>}
      <ul className="mt-5 space-y-3">
        {list.map((c) => (
          <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar avatarId={c.avatarId} name={c.user.firstName} size={56} />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {c.title} {displayName(c.user)}{" "}
                  <span className={`ms-2 rounded-full px-2.5 py-0.5 text-xs ${CLINICIAN_STATUS[c.status].style}`}>{CLINICIAN_STATUS[c.status].label}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {CLINICIAN_KIND[c.kind]} · {c.specialty} · {c.city ?? "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  شماره‌ی نظام: <span dir="ltr">{c.licenseNumber}</span> · کد ملی: {toPersianDigits(c.user.nationalId ?? "-")} · موبایل:{" "}
                  <span dir="ltr">{toPersianDigits(c.user.phone)}</span> · درخواست: {formatJalali(c.createdAt)} · مراجعان: {toPersianDigits(c._count.grants)}
                </p>
                {c.bio && <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{c.bio}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500">مدارک:</span>
                  {c.user.uploads.length === 0 ? (
                    <span className="text-amber-700">مدرکی بارگذاری نشده</span>
                  ) : (
                    c.user.uploads.map((d) => (
                      <a key={d.id} href={`/api/files/${d.id}`} target="_blank" rel="noopener" className="rounded-full bg-brand-50 px-3 py-1 text-brand-700 hover:bg-brand-100" dir="auto">
                        📎 {d.name}
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>
            <form action={reviewClinician} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="note" defaultValue={c.reviewNote ?? ""} placeholder="یادداشت برای متقاضی (اختیاری)" className="min-w-60 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              {c.status !== "APPROVED" && (
                <button name="decision" value="APPROVED" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white">تأیید</button>
              )}
              {c.status !== "REJECTED" && (
                <button name="decision" value="REJECTED" className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-700">
                  {c.status === "APPROVED" ? "تعلیق" : "رد"}
                </button>
              )}
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
