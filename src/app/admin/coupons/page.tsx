import type { Metadata } from "next";
import { db } from "@/lib/db";
import StateForm from "@/components/academy/StateForm";
import { inputCls } from "@/components/academy/CourseFields";
import { saveCoupon, toggleCoupon } from "@/server/academy-admin";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "کدهای تخفیف" };

export default async function CouponsPage() {
  const [coupons, courses] = await Promise.all([
    db.coupon.findMany({ include: { course: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    db.course.findMany({ select: { id: true, title: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <h1 className="text-2xl font-extrabold">کدهای تخفیف آکادمی</h1>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-bold">کد جدید</h2>
        <StateForm action={saveCoupon} submit="ساخت کد" okText="کد ساخته شد.">
          <div className="grid gap-3 sm:grid-cols-5">
            <label>
              <span className="text-xs text-slate-600">کد</span>
              <input name="code" required dir="ltr" placeholder="YALDA30" className={inputCls + " uppercase"} />
            </label>
            <label>
              <span className="text-xs text-slate-600">درصد تخفیف</span>
              <input name="percent" required inputMode="numeric" placeholder="30" className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-slate-600">سقف استفاده</span>
              <input name="maxUses" inputMode="numeric" placeholder="نامحدود" className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-slate-600">انقضا (شمسی)</span>
              <input name="expiresAt" dir="ltr" placeholder="1405/09/30" className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-slate-600">دوره</span>
              <select name="courseId" className={inputCls}>
                <option value="">همه‌ی دوره‌ها</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
          </div>
        </StateForm>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="p-3 text-start">کد</th>
              <th className="p-3 text-start">تخفیف</th>
              <th className="p-3 text-start">دوره</th>
              <th className="p-3 text-start">استفاده</th>
              <th className="p-3 text-start">انقضا</th>
              <th className="p-3 text-start">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-slate-100">
                <td className="p-3 font-mono" dir="ltr">{c.code}</td>
                <td className="p-3">{toPersianDigits(c.percent)}٪</td>
                <td className="p-3 text-slate-500">{c.course?.title ?? "همه"}</td>
                <td className="p-3">
                  {toPersianDigits(c.used)}
                  {c.maxUses != null && ` / ${toPersianDigits(c.maxUses)}`}
                </td>
                <td className="p-3 text-slate-500">{c.expiresAt ? formatJalali(c.expiresAt) : "-"}</td>
                <td className="p-3">
                  <form action={toggleCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className={`rounded-full px-3 py-1 text-xs ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.active ? "فعال (غیرفعال کن)" : "غیرفعال (فعال کن)"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">کدی ساخته نشده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
