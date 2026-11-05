import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CLINICIAN_KIND, displayName } from "@/lib/clinicians";
import { toPersianDigits } from "@/lib/scoring";
import { grantAccess, revokeAccess } from "@/server/clinician";
import { bookAppointment } from "@/server/booking";
import { getFreeSlots } from "@/lib/scheduling";
import { formatTehran, formatTehranTime, formatToman, tehranMidnight } from "@/lib/tehran-time";

export const metadata: Metadata = { title: "پروفایل متخصص" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; referral?: string }> };

export default async function ClinicianPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, referral } = await searchParams;
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

  const slots = c.acceptsOnline ? await getFreeSlots(c.id) : [];
  const byDay = new Map<number, typeof slots>();
  for (const s of slots) {
    const key = tehranMidnight(s.startsAt).getTime();
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const referralId =
    me && referral
      ? (await db.referral.findFirst({ where: { id: referral, patientId: me.id, toClinicianId: c.id, status: { in: ["NEW", "ACCEPTED"] } } }))?.id
      : undefined;

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


        <section id="booking" className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold text-brand-700">رزرو ویزیت آنلاین</h2>
            <p className="text-sm text-slate-600">
              {toPersianDigits(c.sessionMinutes)} دقیقه · <span className="font-bold">{formatToman(c.sessionPrice)}</span>
            </p>
          </div>
          {error === "slot" && (
            <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">این زمان دیگر آزاد نیست. لطفاً زمان دیگری انتخاب کنید.</p>
          )}
          {!c.acceptsOnline ? (
            <p className="mt-3 text-sm text-slate-500">این متخصص در حال حاضر ویزیت آنلاین نمی‌پذیرد.</p>
          ) : slots.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">در دو هفته‌ی آینده زمان خالی وجود ندارد.</p>
          ) : me?.id === c.userId ? (
            <p className="mt-3 text-sm text-slate-500">{toPersianDigits(slots.length)} زمان خالی برای رزرو مراجعان نمایش داده می‌شود.</p>
          ) : (
            <form action={bookAppointment} className="mt-4 space-y-2">
              <input type="hidden" name="clinicianId" value={c.id} />
              {referralId && <input type="hidden" name="referralId" value={referralId} />}
              {[...byDay.entries()].map(([day, list], i) => (
                <details key={day} open={i === 0} className="group rounded-xl bg-white/70 px-3 py-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700">
                    <span>{formatTehran(new Date(day + 12 * 3600_000), { weekday: "long", day: "numeric", month: "long" })}</span>
                    <span className="text-xs font-normal text-slate-400">
                      {toPersianDigits(list.length)} زمان خالی <span className="inline-block transition group-open:rotate-180">▾</span>
                    </span>
                  </summary>
                  <div className="mt-3 mb-1 flex flex-wrap gap-2">
                    {list.map((s) => (
                      <button
                        key={s.startsAt.toISOString()}
                        name="startsAt"
                        value={s.startsAt.toISOString()}
                        className="rounded-xl border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-600 hover:text-white"
                      >
                        {formatTehranTime(s.startsAt)}
                      </button>
                    ))}
                  </div>
                </details>
              ))}
              <label className="flex items-start gap-2 pt-2 text-sm leading-6 text-slate-600">
                <input type="checkbox" name="shareRecord" defaultChecked className="mt-1 h-4 w-4 accent-brand-600" />
                پرونده‌ی تست‌هایم برای این جلسه با متخصص به اشتراک گذاشته شود.
              </label>
              {!me && <p className="text-xs text-slate-500">برای رزرو ابتدا وارد شوید؛ با انتخاب زمان به صفحه‌ی ورود می‌روید.</p>}
            </form>
          )}
        </section>

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
