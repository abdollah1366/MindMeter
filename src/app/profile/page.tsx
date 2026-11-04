import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { currentJalaliYear, dateToJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";

export const metadata: Metadata = { title: "اطلاعات من" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function ProfilePage({ searchParams }: Props) {
  const { next = "" } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");

  const b = user.birthDate ? dateToJalali(user.birthDate) : null;
  const thisYear = currentJalaliYear();
  const years = Array.from({ length: 100 }, (_, i) => thisYear - 5 - i);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold">اطلاعات من</h1>
      <p className="mt-2 text-sm text-slate-500">
        شماره موبایل: <span dir="ltr">{toPersianDigits(user.phone)}</span>
      </p>
      {next && !isProfileComplete(user) && (
        <p className="mt-4 rounded-xl bg-calm-50 p-4 text-sm leading-7 text-calm-700">
          برای صدور گزارش رسمی قابل چاپ، تکمیل اطلاعات زیر لازم است. این اطلاعات فقط در گزارش شما و برای متخصصی که به او دسترسی بدهید نمایش داده می‌شود.
        </p>
      )}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <ProfileForm
          next={next}
          years={years}
          defaults={{
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            nationalId: user.nationalId ?? "",
            sex: user.sex ?? "",
            birthYear: b ? String(b.jy) : "",
            birthMonth: b ? String(b.jm) : "",
            birthDay: b ? String(b.jd) : "",
            education: user.education ?? "",
            city: user.city ?? "",
          }}
        />
      </div>
    </div>
  );
}
