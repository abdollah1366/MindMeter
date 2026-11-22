import type { ReactNode } from "react";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { EAT10_MAX_TOTAL, EAT10_CUTOFF } from "@/lib/speech/eat-10-types";

type Props = { result: { totalScore: number; completedAt: Date }; createdAt?: Date | string | null; showHeader?: boolean };

export default function Eat10Report({ result, createdAt, showHeader = true }: Props) {
  const date = createdAt ? (createdAt instanceof Date ? formatJalali(createdAt) : createdAt) : null;
  const abnormal = result.totalScore >= EAT10_CUTOFF;
  return (
    <div className="space-y-5 font-sans">
      {showHeader ? (
        <header className="border-b-2 border-brand-500 pb-4">
          <p className="text-xl font-extrabold text-brand-700">مایند‌متر</p>
          <p className="text-xs text-slate-400" dir="ltr">www.MindMeter.ir</p>
          <h1 className="mt-4 text-lg font-extrabold text-slate-800">پرسشنامه ارزیابی بلع (EAT-10)</h1>
        </header>
      ) : null}
      <section className="rounded-2xl bg-gradient-to-bl from-brand-600 to-calm-700 p-5 text-white">
        <p className="text-sm text-brand-100">نمره کل پرسشنامه</p>
        <p className="mt-1 text-4xl font-extrabold" dir="ltr">
          {toPersianDigits(result.totalScore)} <span className="text-lg font-medium">/ {toPersianDigits(EAT10_MAX_TOTAL)}</span>
        </p>
        <p className="mt-2 text-xs leading-6 text-brand-100">
          نمره بالاتر به معنای مشکل بلع بیشتر است. نمره {toPersianDigits(EAT10_CUTOFF)} یا بیشتر نشانه‌ی احتمالی اختلال بلع (دیسفاژی) است.
        </p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-600">
        <h2 className="mb-2 text-sm font-bold text-slate-700">تفسیر</h2>
        <p>{abnormal ? "نمره‌ی شما در محدوده‌ی نشان‌دهنده‌ی احتمال اختلال بلع قرار دارد. برای ارزیابی دقیق‌تر با متخصص گفتار یا پزشک مشورت کنید." : "نمره‌ی شما در محدوده‌ی بدون اختلال بلع قرار دارد."}</p>
        <p className="mt-3 text-xs text-slate-500">این پرسشنامه تشخیص پزشکی نیست و جایگزین ارزیابی بالینی نمی‌شود.</p>
      </section>
    </div>
  );
}
