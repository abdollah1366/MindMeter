import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { courseCards } from "@/lib/academy-server";
import { formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "دوره‌های آکادمی" };

export default async function AdminCourses() {
  const [courses, students, sales] = await Promise.all([
    courseCards({}),
    db.enrollment.groupBy({ by: ["courseId"], where: { status: "ACTIVE" }, _count: { _all: true }, _sum: { price: true } }),
    db.payment.aggregate({ where: { status: "PAID", enrollmentId: { not: null } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const stat = new Map(students.map((s) => [s.courseId, s]));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">دوره‌های آکادمی</h1>
          <p className="mt-1 text-sm text-slate-500">
            فروش کل: {formatToman(sales._sum.amount ?? 0)} در {toPersianDigits(sales._count._all)} پرداخت
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/coupons" className="rounded-xl border border-slate-200 bg-white px-4 py-2 hover:text-brand-600">کدهای تخفیف</Link>
          <Link href="/admin/courses/new" className="rounded-xl bg-brand-600 px-4 py-2 font-bold text-white hover:bg-brand-700">+ دوره‌ی جدید</Link>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="p-3 text-start">دوره</th>
              <th className="p-3 text-start">مدرس</th>
              <th className="p-3 text-start">وضعیت</th>
              <th className="p-3 text-start">شهریه</th>
              <th className="p-3 text-start">درس</th>
              <th className="p-3 text-start">دانشجو</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3">
                  <Link href={`/admin/courses/${c.id}`} className="font-bold text-brand-700 hover:underline">{c.title}</Link>
                </td>
                <td className="p-3 text-slate-500">{c.instructor}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {c.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"}
                  </span>
                </td>
                <td className="p-3">{formatToman(c.price)}</td>
                <td className="p-3">{toPersianDigits(c.lessons)}</td>
                <td className="p-3">{toPersianDigits(stat.get(c.id)?._count._all ?? 0)}</td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">هنوز دوره‌ای ساخته نشده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
