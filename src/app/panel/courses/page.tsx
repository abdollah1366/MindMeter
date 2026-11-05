import type { Metadata } from "next";
import Link from "next/link";
import { requireClinician } from "@/lib/auth/guards";
import { courseCards } from "@/lib/academy-server";
import { formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "دوره‌های من (مدرس)" };

export default async function PanelCourses() {
  const { profile } = await requireClinician("/panel/courses");
  const courses = await courseCards({ instructorId: profile.id });
  return (
    <div>
      <h1 className="text-xl font-extrabold">دوره‌هایی که تدریس می‌کنید</h1>
      <p className="mt-1 text-sm text-slate-500">برای تدریس در آکادمی با مدیر سایت هماهنگ کنید تا دوره به نام شما ساخته شود. سپس درس‌ها، لینک کلاس‌های زنده و آزمون را خودتان ویرایش کنید.</p>
      {courses.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-white p-6 text-slate-500">هنوز دوره‌ای به شما اختصاص داده نشده است.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id}>
              <Link href={`/panel/courses/${c.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-400">
                <p className="font-bold">{c.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {c.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"} · {toPersianDigits(c.lessons)} درس · {formatToman(c.price)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
