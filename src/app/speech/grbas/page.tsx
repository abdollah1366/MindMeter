import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GrbasRunner, { type GrbasPatientOption } from "@/components/speech/GrbasRunner";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { ageFrom } from "@/lib/jalali";
import {
  GRBAS_CLINICAL_NOTE,
  GRBAS_NO_AUDIO_NOTE,
  GRBAS_NO_TOTAL_NOTE,
  GRBAS_UI_NOTE,
} from "@/lib/speech/grbas-types";

export const metadata: Metadata = {
  title: "مقیاس ارزیابی کیفیت صوت GRBAS",
  description:
    "ثبت ارزیابی ادراکی کیفیت صوت در پنج مؤلفه‌ی G، R، B، A و S توسط متخصص تأییدشده.",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ patient?: string }> };

export default async function GrbasPage({ searchParams }: Props) {
  const assessment = await db.speechAssessment.findUnique({
    where: { slug: "grbas" },
    select: { published: true, status: true },
  });
  if (!assessment?.published || assessment.status !== "AVAILABLE") notFound();

  const user = await getCurrentUser();
  const { patient: requestedPatient } = await searchParams;

  let isEvaluator = false;
  let patients: GrbasPatientOption[] = [];

  if (user) {
    const profile = await db.clinicianProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });
    isEvaluator = profile?.status === "APPROVED";

    if (isEvaluator && profile) {
      const grants = await db.accessGrant.findMany({
        where: { clinicianId: profile.id, revokedAt: null },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              birthDate: true,
              sex: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      patients = grants.map(({ patient }) => ({
        id: patient.id,
        name: displayName(patient),
        age: patient.birthDate ? ageFrom(patient.birthDate) : null,
        sex: patient.sex,
      }));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav aria-label="مسیر" className="flex flex-wrap gap-2 text-sm text-slate-500">
        <Link href="/speech" className="hover:text-brand-600">
          ارزیابی گفتار و زبان
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">مقیاس GRBAS</span>
      </nav>

      <header className="rounded-3xl bg-gradient-to-bl from-brand-600 via-brand-700 to-calm-700 px-6 py-8 text-white sm:px-9">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">ارزیابی ادراکی</span>
          <span className="rounded-full bg-white/15 px-3 py-1">پنج مؤلفه‌ی مستقل</span>
          <span className="rounded-full bg-white/15 px-3 py-1">توسط متخصص</span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
          مقیاس ارزیابی کیفیت صوت GRBAS
        </h1>
        <p dir="ltr" className="mt-1 text-right text-sm text-brand-100">
          GRBAS — Perceptual Voice Quality Scale
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-100/90">
          این مقیاس برای ارزیابی ادراکی کیفیت صوت استفاده می‌شود. پنج ویژگی کیفیت صوت
          توسط ارزیاب آموزش‌دیده بررسی و به‌صورت جداگانه امتیازدهی می‌شوند.
        </p>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
        <h2 className="font-bold">پیش از شروع</h2>
        <p className="mt-2">
          این ارزیابی باید توسط متخصص یا ارزیاب آموزش‌دیده انجام شود. امتیازهای ثبت‌شده
          به‌تنهایی جایگزین ارزیابی جامع بالینی نیستند.
        </p>
      </section>

      {!user ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
          <h2 className="text-lg font-extrabold text-slate-800">ثبت ارزیابی نیازمند ورود است</h2>
          <p className="mt-2">
            ثبت ارزیابی GRBAS فقط برای متخصص تأییدشده و روی پرونده‌ی مراجعی انجام می‌شود که
            پرونده‌اش را با او به اشتراک گذاشته است. برای مشاهده‌ی توضیحات مقیاس می‌توانید
            همین صفحه را بخوانید.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login?next=/speech/grbas"
              className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              ورود به حساب
            </Link>
            <Link href="/speech" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              بازگشت به فهرست آزمون‌ها
            </Link>
          </div>
        </section>
      ) : !isEvaluator ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
          <h2 className="text-lg font-extrabold text-slate-800">ثبت ارزیابی برای این حساب فعال نیست</h2>
          <p className="mt-2">
            ثبت نتیجه‌ی معتبر GRBAS فقط برای متخصص دارای پروفایل تأییدشده ممکن است. اگر متخصص
            هستید، ابتدا درخواست عضویت را تکمیل کنید و پس از تأیید، مراجع باید پرونده‌ی خود را
            با شما به اشتراک بگذارد.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/clinician/apply" className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
              درخواست عضویت متخصص
            </Link>
            <Link href="/clinicians" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
              مشاهده‌ی متخصصان
            </Link>
          </div>
        </section>
      ) : patients.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
          <h2 className="text-lg font-extrabold text-slate-800">هنوز مراجعی پرونده‌اش را با شما به اشتراک نگذاشته است</h2>
          <p className="mt-2">
            برای ثبت ارزیابی، مراجع باید از صفحه‌ی پروفایل عمومی شما دسترسی پرونده را فعال کند.
          </p>
          <Link href="/panel" className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700">
            بازگشت به پنل
          </Link>
        </section>
      ) : (
        <GrbasRunner patients={patients} initialPatientId={requestedPatient} />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        <h2 className="font-bold text-slate-800">درباره‌ی این ابزار</h2>
        <ul className="mt-2 list-disc space-y-2 pr-5">
          <li>
            این ابزار یک ثبت‌کننده‌ی ارزیابی ادراکی است، نه تحلیل خودکار آکوستیکی. هیچ امتیازی از
            هیچ امتیازی از روی تحلیل آکوستیکی صوت ساخته نمی‌شود.
          </li>
          <li>{GRBAS_NO_TOTAL_NOTE}</li>
          <li>{GRBAS_NO_AUDIO_NOTE}</li>
          <li>{GRBAS_CLINICAL_NOTE}</li>
          <li>{GRBAS_UI_NOTE}</li>
        </ul>
      </section>
    </div>
  );
}
