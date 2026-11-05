import Link from "next/link";
import { LESSON_KIND } from "@/lib/academy";
import { toPersianDigits } from "@/lib/scoring";

type L = { id: string; title: string; kind: string; freePreview: boolean };

/** فهرست درس‌ها در کنار کلاس */
export default function LessonNav({
  base,
  lessons,
  done,
  current,
  canOpenAll,
  hasExam,
  examActive,
}: {
  base: string;
  lessons: L[];
  done: Set<string>;
  current?: string;
  canOpenAll: boolean;
  hasExam: boolean;
  examActive?: boolean;
}) {
  const percent = lessons.length ? Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100) : 0;
  return (
    <nav className="rounded-3xl border border-slate-200 bg-white p-4">
      <Link href={`${base}/learn`} className="block px-2 text-sm font-bold hover:text-brand-700">کلاس درس</Link>
      <div className="mx-2 mt-2 h-1.5 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
      </div>
      <ol className="mt-3 space-y-0.5 text-sm">
        {lessons.map((l, i) => {
          const open = canOpenAll || l.freePreview;
          const cls = `flex items-center gap-2 rounded-xl px-2 py-2 ${l.id === current ? "bg-brand-50 font-bold text-brand-800" : ""}`;
          const inner = (
            <>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${done.has(l.id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {done.has(l.id) ? "✓" : toPersianDigits(i + 1)}
              </span>
              <span className="min-w-0 flex-1 truncate">{l.title}</span>
              <span className="text-[10px] text-slate-400">{open ? LESSON_KIND[l.kind].icon : "🔒"}</span>
            </>
          );
          return (
            <li key={l.id}>
              {open ? <Link href={`${base}/lessons/${l.id}`} className={`${cls} hover:bg-slate-50`}>{inner}</Link> : <div className={`${cls} text-slate-400`}>{inner}</div>}
            </li>
          );
        })}
        {hasExam && (
          <li>
            <Link href={`${base}/exam`} className={`flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50 ${examActive ? "bg-calm-50 font-bold text-calm-700" : ""}`}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-calm-50 text-[11px] text-calm-700">✎</span>
              آزمون پایانی
            </Link>
          </li>
        )}
      </ol>
    </nav>
  );
}
