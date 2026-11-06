import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { AUDIT_LABEL } from "@/lib/audit";
import { displayName } from "@/lib/clinicians";
import { formatTehran } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "سوابق دسترسی" };

type Props = { searchParams: Promise<{ action?: string; patient?: string; page?: string }> };
const PAGE = 50;

export default async function AuditPage({ searchParams }: Props) {
  const { action, patient, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const where = { ...(action && AUDIT_LABEL[action] ? { action } : {}), ...(patient ? { patientId: patient } : {}) };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE }),
    db.auditLog.count({ where }),
  ]);
  const ids = [...new Set(rows.flatMap((r) => [r.actorId, r.patientId]).filter((x): x is string => Boolean(x)))];
  const users = new Map((await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, phone: true, role: true } })).map((u) => [u.id, u]));
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ action, patient, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/admin/audit${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold">سوابق دسترسی</h1>
      <p className="mt-1 text-sm text-slate-500">
        هر مشاهده‌ی پرونده یا گزارش توسط متخصص، ثبت یادداشت بالینی و تغییرات حساس مدیریتی اینجا ثبت می‌شود. مراجعان هم سوابق پرونده‌ی خودشان را در «پرونده‌ی من» می‌بینند.
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
        <Link href={q({ action: undefined, page: undefined })} className={`rounded-full px-3 py-1.5 ${!action ? "bg-brand-600 text-white" : "bg-white"}`}>همه</Link>
        {Object.entries(AUDIT_LABEL).map(([k, v]) => (
          <Link key={k} href={q({ action: k, page: undefined })} className={`rounded-full px-3 py-1.5 ${action === k ? "bg-brand-600 text-white" : "bg-white hover:bg-slate-50"}`}>
            {v}
          </Link>
        ))}
      </div>
      {patient && (
        <p className="mt-3 text-sm">
          فقط پرونده‌ی {users.get(patient) ? displayName(users.get(patient)!) : "این مراجع"} ·{" "}
          <Link href={q({ patient: undefined })} className="text-brand-700 underline">حذف فیلتر</Link>
        </p>
      )}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="p-3 text-start">زمان</th>
              <th className="p-3 text-start">انجام‌دهنده</th>
              <th className="p-3 text-start">رویداد</th>
              <th className="p-3 text-start">مراجع</th>
              <th className="p-3 text-start">جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const actor = r.actorId ? users.get(r.actorId) : null;
              const pat = r.patientId ? users.get(r.patientId) : null;
              const meta = JSON.parse(r.meta) as Record<string, unknown>;
              return (
                <tr key={r.id} className="border-b border-slate-100 align-top">
                  <td className="whitespace-nowrap p-3 text-xs text-slate-500">{formatTehran(r.createdAt, { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-3">{actor ? displayName(actor) : "سیستم"}</td>
                  <td className="p-3">{AUDIT_LABEL[r.action] ?? r.action}</td>
                  <td className="p-3">
                    {pat ? <Link href={q({ patient: pat.id, page: undefined })} className="text-brand-700 hover:underline">{displayName(pat)}</Link> : "-"}
                  </td>
                  <td className="p-3 text-xs text-slate-500" dir="ltr">
                    {Object.entries(meta).map(([k, v]) => `${k}: ${String(v)}`).join(" · ") || "-"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">رویدادی ثبت نشده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={q({ page: String(page - 1) })} className="rounded-xl bg-white px-4 py-2">→ جدیدتر</Link>}
          <span className="text-slate-500">صفحه‌ی {toPersianDigits(page)} از {toPersianDigits(Math.ceil(total / PAGE))}</span>
          {page * PAGE < total && <Link href={q({ page: String(page + 1) })} className="rounded-xl bg-white px-4 py-2">قدیمی‌تر ←</Link>}
        </div>
      )}
    </>
  );
}
