import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CLINICIAN_KIND, displayName } from "@/lib/clinicians";
import { toPersianDigits } from "@/lib/scoring";
import { grantAccess, revokeAccess } from "@/server/clinician";

export const metadata: Metadata = { title: "پروفایل متخصص" };

type Props = { params: Promise<{ id: string }> };

export default async function ClinicianPage({ params }: Props) {
  const { id } = await params;
  const c = await db.clinicianProfile.findUnique({
    where: { id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!c || c.status !== "APPROVED") notFound();

  const me = await getCurrentUser();
  const grant = me
    ? await db.accessGrant.findUnique({ where: { patientId_clinicianId: { patientId: me.id, clinicianId: c.id } } })
    : null;
  const granted = Boolean(grant && !grant.revokedAt);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/clinicians" className="text-sm text-slate-400 hover:text-brand-600">→ همه‌ی متخصصان</Link>
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-7">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100 text-2xl font-bold text-brand-700">
            {c.user.firstName?.[0] ?? "؟"}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">
              {c.title} {displayName(c.user)}
            </h1>
            <p className="text-slate-500">
              {CLINICIAN_KIND[c.kind]} · {c.specialty}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-slate-500">شماره‌ی نظام</dt>
            <dd dir="ltr" className="text-end font-medium">{c.licenseNumber}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-slate-500">سابقه</dt>
            <dd className="font-medium">{c.yearsExperience ? `${toPersianDigits(c.yearsExperience)} سال` : "-"}</dd>
          </div>
        </dl>
        {c.bio && <p className="mt-6 whitespace-pre-line leading-8 text-slate-700">{c.bio}</p>}

        <div className="mt-8 rounded-2xl bg-calm-50 p-5">
          <h2 className="font-bold text-calm-700">اشتراک پرونده</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            با اشتراک پرونده، این متخصص می‌تواند نتایج و گزارش تست‌های شما و اطلاعات هویتی‌تان را ببیند. هر زمان بخواهید می‌توانید
            دسترسی را لغو کنید.
          </p>
          {!me ? (
            <Link href={`/login?next=/clinicians/${c.id}`} className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2 text-white">
              ورود برای اشتراک پرونده
            </Link>
          ) : me.id === c.userId ? null : granted ? (
            <form action={revokeAccess} className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="clinicianId" value={c.id} />
              <span className="text-sm text-emerald-700">✓ پرونده‌ی شما با این متخصص به اشتراک گذاشته شده است.</span>
              <button className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm text-rose-700">لغو دسترسی</button>
            </form>
          ) : (
            <form action={grantAccess} className="mt-4">
              <input type="hidden" name="clinicianId" value={c.id} />
              <button className="rounded-xl bg-brand-600 px-5 py-2 text-white hover:bg-brand-700">اشتراک پرونده با این متخصص</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
