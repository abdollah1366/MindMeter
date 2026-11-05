import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CLINICIAN_KIND, displayName } from "@/lib/clinicians";
import { getTest } from "@/data/tests";
import { formatToman } from "@/lib/tehran-time";
import ReferralForm from "@/components/ReferralForm";

export const metadata: Metadata = { title: "درخواست مشاوره" };

type Props = { searchParams: Promise<{ result?: string; to?: string }> };

export default async function NewReferralPage({ searchParams }: Props) {
  const { result, to } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const qs = new URLSearchParams({ ...(result ? { result } : {}), ...(to ? { to } : {}) }).toString();
    redirect(`/login?next=${encodeURIComponent(`/referral/new${qs ? `?${qs}` : ""}`)}`);
  }

  const r = result ? await db.testResult.findUnique({ where: { id: result } }) : null;
  const testResult = r && r.userId === user.id ? r : null;
  const test = testResult ? getTest(testResult.testSlug) : undefined;
  const target = to ? await db.clinicianProfile.findFirst({ where: { id: to, status: "APPROVED" }, include: { user: true } }) : null;

  const suggested = await db.clinicianProfile.findMany({
    where: { status: "APPROVED", acceptsOnline: true, userId: { not: user.id } },
    include: { user: true, _count: { select: { availability: true } } },
    orderBy: { yearsExperience: "desc" },
    take: 6,
  });

  const defaultReason = test ? `نتیجه‌ی تست ${test.title} (${test.code}) من نگران‌کننده بود و می‌خواهم با یک متخصص مشورت کنم.` : "";

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="text-2xl font-extrabold">درخواست مشاوره با متخصص</h1>
        <p className="mt-2 leading-8 text-slate-600">
          {target
            ? `درخواست شما مستقیماً برای ${target.title ?? ""} ${displayName(target.user)} فرستاده می‌شود.`
            : "درخواستتان را ثبت کنید تا یکی از متخصصان تأییدشده‌ی مایندمتر آن را بپذیرد و با شما نوبت هماهنگ شود."}
        </p>
        {test && (
          <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
            نتیجه‌ی تست «{test.title}» به این درخواست پیوست می‌شود.
          </p>
        )}
        <div className="mt-5">
          <ReferralForm resultId={testResult?.id} defaultReason={defaultReason} toClinicianId={target?.id} />
        </div>
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm leading-7 text-rose-800">
          اگر فکر آسیب به خود یا دیگران دارید، منتظر نمانید: با اورژانس اجتماعی ۱۲۳، صدای مشاور بهزیستی ۱۴۸۰ یا اورژانس ۱۱۵ تماس بگیرید.
        </p>
      </div>

      <aside>
        <h2 className="font-bold">یا مستقیم نوبت بگیرید</h2>
        <div className="mt-3 space-y-3">
          {suggested.length === 0 && <p className="text-sm text-slate-500">فعلاً متخصصی با نوبت آنلاین ثبت نشده است.</p>}
          {suggested.map((c) => (
            <Link
              key={c.id}
              href={`/clinicians/${c.id}#booking`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300"
            >
              <p className="font-bold">
                {c.title} {displayName(c.user)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {CLINICIAN_KIND[c.kind]} · {c.specialty}
              </p>
              <p className="mt-2 text-xs text-brand-700">
                {c._count.availability ? formatToman(c.sessionPrice) : "هنوز ساعت کاری ثبت نکرده"}
              </p>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
