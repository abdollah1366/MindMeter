import Link from "next/link";
import type { NormComparison, NormReport } from "@/lib/norms";
import { toPersianDigits } from "@/lib/scoring";

const fa = (n: number) => toPersianDigits(n);

function label(ss: number) {
  if (ss >= 130) return "بسیار بالاتر از میانگین";
  if (ss >= 120) return "بالاتر از میانگین";
  if (ss >= 110) return "کمی بالاتر از میانگین";
  if (ss >= 90) return "در محدوده‌ی میانگین";
  if (ss >= 80) return "کمی پایین‌تر از میانگین";
  if (ss >= 70) return "پایین‌تر از میانگین";
  return "بسیار پایین‌تر از میانگین";
}

/** نوار صدک: جای فرد در گروه */
function PercentileBar({ p }: { p: number }) {
  return (
    <div className="relative mt-2 h-2.5 rounded-full bg-gradient-to-l from-calm-200 via-brand-100 to-slate-100">
      <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-brand-600 shadow" style={{ right: `calc(${p}% - 8px)` }} />
    </div>
  );
}

function Comparison({ c, title }: { c: NormComparison; title: string }) {
  const total = c.scales.find((s) => s.key === "total") ?? c.scales[0];
  return (
    <section className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-slate-500">
          گروه مقایسه: {c.groupLabel}
          {c.n > 0 && ` · ${fa(c.n)} نفر`}
        </p>
      </div>
      {c.fallbackNote && <p className="mt-2 text-xs text-amber-700">{c.fallbackNote}</p>}

      {total.standard != null && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-brand-50 p-4 text-center">
            <p className="text-xs text-slate-500">نمره‌ی استاندارد (میانگین ۱۰۰)</p>
            <p className="mt-1 text-3xl font-extrabold text-brand-700">{fa(total.standard)}</p>
            <p className="mt-1 text-xs text-brand-700">{label(total.standard)}</p>
          </div>
          {total.percentile != null && (
            <div className="rounded-xl bg-calm-50 p-4 text-center">
              <p className="text-xs text-slate-500">صدک</p>
              <p className="mt-1 text-3xl font-extrabold text-calm-700">{fa(total.percentile)}</p>
              <p className="mt-1 text-xs text-calm-700">از {fa(total.percentile)}٪ افراد این گروه بهتر عمل کرده‌اید</p>
            </div>
          )}
        </div>
      )}

      <table className="mt-4 w-full text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="py-1.5 text-start">مقیاس</th>
            <th className="py-1.5 text-start">نمره‌ی شما</th>
            <th className="py-1.5 text-start">میانگین گروه</th>
            <th className="py-1.5 text-start">صدک</th>
            <th className="py-1.5 text-start">استاندارد</th>
          </tr>
        </thead>
        <tbody>
          {c.scales.map((s) => (
            <tr key={s.key} className="border-t border-slate-100 align-top">
              <td className="py-2">{s.title}</td>
              <td className="py-2 font-bold">{fa(s.score)}</td>
              <td className="py-2 text-slate-500">
                {fa(Math.round(s.mean * 10) / 10)} <span className="text-xs">(±{fa(Math.round(s.sd * 10) / 10)})</span>
              </td>
              <td className="py-2">
                {s.percentile != null ? fa(s.percentile) : "-"}
                {s.percentile != null && <PercentileBar p={s.percentile} />}
              </td>
              <td className="py-2">{s.standard != null ? fa(s.standard) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.source && <p className="mt-3 text-xs text-slate-500">منبع هنجار: {c.source}</p>}
    </section>
  );
}

/** مقایسه‌ی نتیجه با هنجار داخلی و با شرکت‌کنندگان سایت */
export default function NormPanel({ report, print }: { report: NormReport; print?: boolean }) {
  return (
    <div className="space-y-4">
      {report.needsProfile && !print && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">
          برای مقایسه با هم‌سن‌ها و هم‌جنس‌ها، تاریخ تولد و جنسیت خود را در{" "}
          <Link href="/profile" className="font-bold underline">
            اطلاعات من
          </Link>{" "}
          کامل کنید.
        </p>
      )}

      {report.official ? (
        <Comparison c={report.official} title="مقایسه با هنجار داخلی" />
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm leading-7 text-slate-500">
          <b>هنجار داخلی:</b> هنوز جدول هنجار رسمی برای این گروه سنی ثبت نشده است. تا آن زمان مقایسه با شرکت‌کنندگان سایت ملاک است.
        </p>
      )}

      {report.participants ? (
        <Comparison c={report.participants} title="مقایسه با شرکت‌کنندگان مایندمتر" />
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm leading-7 text-slate-500">
          <b>مقایسه با شرکت‌کنندگان:</b> هنوز تعداد کافی ({fa(5)} نفر یا بیشتر) این تست را انجام نداده‌اند. با بیشتر شدن شرکت‌کنندگان، جایگاه شما
          بین هم‌سن‌ها و هم‌جنس‌ها اینجا نمایش داده می‌شود.
        </p>
      )}

      <p className="text-xs leading-6 text-slate-500">
        نمره‌ی استاندارد با میانگین ۱۰۰ و انحراف معیار ۱۵ از روی گروه مقایسه محاسبه می‌شود و هوش‌بهر رسمی نیست. هنجار شرکت‌کنندگان از نخستین نتیجه‌ی هر
        کاربر ساخته می‌شود و با افزایش شرکت‌کنندگان دقیق‌تر می‌شود؛ تا وقتی هر گروه کمتر از {fa(30)} نفر دارد، آن را با احتیاط تفسیر کنید.
      </p>
    </div>
  );
}
