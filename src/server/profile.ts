"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";
import { isValidNationalId, toEnglishDigits } from "@/lib/validation";
import { currentJalaliYear, jalaliToDate } from "@/lib/jalali";

export type ProfileState = { error?: string; ok?: boolean; values?: Record<string, string> };

const SEXES = ["MALE", "FEMALE", "OTHER"];

export async function saveProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login?next=/profile");

  const str = (k: string) => String(form.get(k) ?? "").trim();
  const num = (k: string) => Number(toEnglishDigits(str(k)));

  const values = Object.fromEntries(
    ["firstName", "lastName", "nationalId", "sex", "birthYear", "birthMonth", "birthDay", "education", "city"].map((k) => [k, str(k)]),
  );
  const fail = (error: string): ProfileState => ({ error, values });

  const firstName = str("firstName");
  const lastName = str("lastName");
  const nationalId = toEnglishDigits(str("nationalId"));
  const sex = str("sex");
  const jy = num("birthYear"), jm = num("birthMonth"), jd = num("birthDay");

  if (firstName.length < 2 || lastName.length < 2) return fail("نام و نام خانوادگی را کامل وارد کنید.");
  if (!isValidNationalId(nationalId)) return fail("کد ملی معتبر نیست.");
  if (!SEXES.includes(sex)) return fail("جنسیت را انتخاب کنید.");
  const thisYear = currentJalaliYear();
  if (!(jy >= thisYear - 110 && jy <= thisYear - 5 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31)) {
    return fail("تاریخ تولد معتبر نیست.");
  }

  const taken = await db.user.findFirst({ where: { nationalId, NOT: { id: userId } } });
  if (taken) return fail("این کد ملی قبلاً برای حساب دیگری ثبت شده است.");

  await db.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      nationalId,
      sex,
      birthDate: jalaliToDate(jy, jm, jd),
      education: str("education") || null,
      city: str("city") || null,
    },
  });
  revalidatePath("/", "layout");

  const next = str("next");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  return { ok: true, values };
}
