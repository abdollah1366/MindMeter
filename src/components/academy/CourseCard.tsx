import Link from "next/link";
import CourseCover from "./CourseCover";
import { COURSE_LEVEL, formatMinutes } from "@/lib/academy";
import { formatToman } from "@/lib/tehran-time";
import { toPersianDigits } from "@/lib/scoring";

export type CourseCardData = {
  slug: string;
  title: string;
  summary: string;
  theme: string;
  level: string;
  price: number;
  instructor: string;
  lessons: number;
  minutes: number;
  hasLive: boolean;
};

export default function CourseCard({ c }: { c: CourseCardData }) {
  return (
    <Link href={`/academy/${c.slug}`} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      <CourseCover title={c.title} theme={c.theme} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{COURSE_LEVEL[c.level]}</span>
          {c.hasLive && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">● کلاس زنده</span>}
        </div>
        <h3 className="mt-2 font-extrabold group-hover:text-brand-700">{c.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-7 text-slate-500">{c.summary}</p>
        <p className="mt-2 text-xs text-slate-400">{c.instructor}</p>
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span className="text-slate-500">
            {toPersianDigits(c.lessons)} درس{c.minutes ? ` · ${formatMinutes(c.minutes)}` : ""}
          </span>
          <span className="font-extrabold text-brand-700">{formatToman(c.price)}</span>
        </div>
      </div>
    </Link>
  );
}
