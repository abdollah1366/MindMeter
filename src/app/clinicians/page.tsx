import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { CLINICIAN_KIND, displayName } from "@/lib/clinicians";
import { toPersianDigits } from "@/lib/scoring";
import Avatar from "@/components/Avatar";

export const metadata: Metadata = { title: "متخصصان" };

export default async function CliniciansPage() {
  const list = await db.clinicianProfile.findMany({
    where: { status: "APPROVED" },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">روانشناسان و پزشکان</h1>
          <p className="mt-2 text-slate-500">متخصصان تأییدشده‌ی مایندمتر. می‌توانید پرونده‌ی تست‌های خود را با آن‌ها به اشتراک بگذارید.</p>
        </div>
        <Link href="/clinician/apply" className="text-sm text-brand-600 hover:underline">
          متخصص هستید؟ عضو شوید ←
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          به‌زودی متخصصان به این فهرست اضافه می‌شوند.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} href={`/clinicians/${c.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-400">
              <div className="flex items-center gap-3">
                <Avatar avatarId={c.avatarId} name={c.user.firstName} size={48} />
                <div>
                  <p className="font-bold">
                    {c.title} {displayName(c.user)}
                  </p>
                  <p className="text-xs text-slate-500">{CLINICIAN_KIND[c.kind]}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600">{c.specialty}</p>
              <p className="mt-2 text-xs text-slate-400">
                {c.city}
                {c.yearsExperience ? ` · ${toPersianDigits(c.yearsExperience)} سال سابقه` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
