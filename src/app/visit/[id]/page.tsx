import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { displayName } from "@/lib/clinicians";
import { canJoin, visitWindow } from "@/lib/scheduling";
import { formatTehran } from "@/lib/tehran-time";
import { iceServers, loadVisit } from "@/lib/visit";
import { getVisibleTests } from "@/lib/tests-service";
import VisitRoom from "@/components/VisitRoom";

export const metadata: Metadata = { title: "ویزیت آنلاین", robots: { index: false } };

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCurrentUser())) redirect(`/login?next=/visit/${id}`);
  const visit = await loadVisit(id);
  if (!visit) notFound();
  const a = visit.appointment;
  const otherName =
    visit.role === "patient" ? `${a.clinician.title ?? ""} ${displayName(a.clinician.user)}`.trim() : displayName(a.patient);
  const back = visit.role === "patient" ? "/appointments" : "/panel/appointments";

  if (!canJoin(a)) {
    const { opensAt } = visitWindow(a);
    const msg =
      a.status === "COMPLETED"
        ? "این جلسه برگزار شده و پایان یافته است."
        : a.status === "CANCELLED"
          ? "این نوبت لغو شده است."
          : a.status === "PENDING_PAYMENT"
            ? "هزینه‌ی این نوبت هنوز پرداخت نشده است."
            : opensAt > new Date()
              ? `اتاق ویزیت از ${formatTehran(opensAt, { dateStyle: "full", timeStyle: "short" })} باز می‌شود.`
              : "زمان این جلسه گذشته است.";
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-extrabold">ویزیت با {otherName}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{msg}</p>
        <Link href={back} className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2 text-white">بازگشت به نوبت‌ها</Link>
      </div>
    );
  }

  const tests = visit.role === "clinician" ? (await getVisibleTests()).map((t) => ({ slug: t.slug, title: t.title, code: t.code })) : [];

  return (
    <VisitRoom
      appointmentId={a.id}
      role={visit.role}
      otherName={otherName}
      startsAt={a.startsAt.toISOString()}
      endsAt={a.endsAt.toISOString()}
      serverNow={new Date().toISOString()}
      iceServers={iceServers()}
      tests={tests}
    />
  );
}
