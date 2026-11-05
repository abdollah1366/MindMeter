import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ClinicianApplyForm from "@/components/ClinicianApplyForm";
import { requireUser } from "@/lib/auth/guards";
import { isProfileComplete } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CLINICIAN_STATUS } from "@/lib/clinicians";

export const metadata: Metadata = { title: "عضویت متخصصان" };

export default async function ClinicianApplyPage() {
  const user = await requireUser("/clinician/apply");
  if (!isProfileComplete(user)) redirect("/profile?next=/clinician/apply");
  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold">عضویت روانشناسان و پزشکان</h1>
      <p className="mt-2 leading-7 text-slate-500">
        پس از بررسی مدارک توسط تیم مایندمتر، پروفایل شما در فهرست متخصصان نمایش داده می‌شود و می‌توانید پرونده‌ی مراجعانی که به
        شما دسترسی داده‌اند را ببینید.
      </p>

      {profile && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm">
            وضعیت درخواست:{" "}
            <span className={`rounded-full px-3 py-1 text-sm ${CLINICIAN_STATUS[profile.status]?.style}`}>
              {CLINICIAN_STATUS[profile.status]?.label}
            </span>
          </p>
          {profile.reviewNote && <p className="mt-3 text-sm text-slate-600">یادداشت بررسی: {profile.reviewNote}</p>}
          {profile.status === "APPROVED" && (
            <Link href="/panel" className="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2 text-white">
              ورود به پنل متخصص
            </Link>
          )}
        </div>
      )}

      {profile?.status !== "APPROVED" && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          {profile && <p className="mb-4 text-sm text-slate-500">می‌توانید اطلاعات را ویرایش و دوباره ارسال کنید.</p>}
          <ClinicianApplyForm
            defaults={{
              kind: profile?.kind ?? "",
              title: profile?.title ?? "",
              specialty: profile?.specialty ?? "",
              licenseNumber: profile?.licenseNumber ?? "",
              bio: profile?.bio ?? "",
              city: profile?.city ?? user.city ?? "",
              yearsExperience: profile?.yearsExperience?.toString() ?? "",
            }}
          />
        </div>
      )}
    </div>
  );
}
