import type { Metadata } from "next";
import Link from "next/link";
import { requireClinician } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { ageFrom, formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { getTest } from "@/data/tests";

export const metadata: Metadata = { title: "پنل متخصص" };

const SEX: Record<string, string> = { MALE: "مرد", FEMALE: "زن", OTHER: "سایر" };

export default async function PanelPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireClinician();
  const { q = "" } = await searchParams;

  const grants = await db.accessGrant.findMany({
    where: { clinicianId: profile.id, revokedAt: null },
    include: {
      patient: {
        include: { results: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { results: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const term = q.trim();
  const rows = grants.filter(
    (g) => !term || displayName(g.patient).includes(term) || g.patient.phone.includes(term) || g.patient.nationalId?.includes(term),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">مراجعان ({toPersianDigits(grants.length)})</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="جستجو با نام، موبایل یا کد ملی" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          <button className="rounded-xl bg-brand-600 px-4 text-sm text-white">جستجو</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm leading-7 text-slate-500">
          هنوز مراجعی پرونده‌اش را با شما به اشتراک نگذاشته است. مراجعان از صفحه‌ی پروفایل عمومی شما می‌توانند پرونده‌شان را به اشتراک بگذارند.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface text-slate-500">
              <tr>
                <th className="p-3 text-start">نام</th>
                <th className="p-3 text-start">سن / جنس</th>
                <th className="p-3 text-start">تعداد تست</th>
                <th className="p-3 text-start">آخرین تست</th>
                <th className="p-3 text-start">تاریخ اشتراک</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ patient: p, createdAt }) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-brand-50/40">
                  <td className="p-3">
                    <Link href={`/panel/patients/${p.id}`} className="font-medium text-brand-700 hover:underline">
                      {displayName(p)}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-600">
                    {p.birthDate ? toPersianDigits(ageFrom(p.birthDate)) : "-"} / {p.sex ? SEX[p.sex] : "-"}
                  </td>
                  <td className="p-3">{toPersianDigits(p._count.results)}</td>
                  <td className="p-3 text-slate-600">
                    {p.results[0] ? `${getTest(p.results[0].testSlug)?.code ?? p.results[0].testSlug} · ${formatJalali(p.results[0].createdAt)}` : "-"}
                  </td>
                  <td className="p-3 text-slate-500">{formatJalali(createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
