import type { Metadata } from "next";
import Link from "next/link";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { requireUser } from "@/lib/auth/guards";
import { listSpeechResultsForUser } from "@/lib/speech-result-service";

export const metadata: Metadata = {
  title: "نتایج ارزیابی گفتار من",
  robots: { index: false },
};

export default async function SpeechResultsPage() {
  const user = await requireUser("/speech/results");
  const rows = await listSpeechResultsForUser(user.id, "mpt");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">نتایج ارزیابی گفتار من</h1>
          <p className="mt-1 text-sm text-slate-500">فقط نتایج ذخیرهشدهی این حساب نمایش داده میشود.</p>
        </div>
        <Link href="/speech/mpt" className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          آزمون جدید
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          هنوز نتیجهای از آزمونهای گفتار در پروندهی شما ذخیره نشده است.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/speech/mpt/result/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-400"
              >
                <span>
                  <span className="block font-bold text-slate-800">آزمون حداکثر زمان آواسازی</span>
                  <span className="mt-1 block text-xs text-slate-400">{formatJalali(row.createdAt)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
                    بهترین: {toPersianDigits(((row.result.bestMs ?? 0) / 1000).toFixed(2))} ثانیه
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    {toPersianDigits(row.result.validCount)} تلاش معتبر
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-6 text-slate-500">
        نتایج فقط برای صاحب پرونده قابل مشاهدهاند و هیچ فایل صوتی خامی در آنها ذخیره نمیشود.
      </p>
    </div>
  );
}
