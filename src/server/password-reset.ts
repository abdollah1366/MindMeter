"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { sendOtpSms } from "@/lib/sms";
import { hashPassword } from "@/lib/auth/password";
import { normalizeIranMobile, toEnglishDigits } from "@/lib/validation";

export type ResetRequestState = { error?: string; info?: string; phone?: string };
export type ResetPasswordState = { error?: string; ok?: boolean };

export async function requestPasswordReset(_: ResetRequestState, form: FormData): Promise<ResetRequestState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  if (!identifier) return { error: "نام کاربری یا شماره موبایل را وارد کنید." };

  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: identifier.toLowerCase() },
        { phone: normalizeIranMobile(identifier) || undefined },
      ],
    },
    select: { id: true, phone: true, username: true },
  });

  if (!user) return { error: "کاربری با این مشخصات یافت نشد." };
  if (!user.phone) return { error: "برای این حساب شماره موبایل ثبت نشده است. با پشتیبانی تماس بگیرید." };

  const phone = user.phone;
  const issued = await issueOtp(phone);
  if (!issued.ok) {
    return issued.retryAfter ? { step: "code", phone, error: issued.error } as ResetRequestState : { error: issued.error };
  }
  try {
    await sendOtpSms(phone, issued.code);
  } catch (e) {
    console.error(e);
    return { error: "ارسال پیامک با خطا روبرو شد. دوباره تلاش کنید." };
  }
  return { info: "کد تأیید برای شما پیامک شد.", phone };
}

export async function resetPassword(_: ResetPasswordState, form: FormData): Promise<ResetPasswordState> {
  const phone = normalizeIranMobile(String(form.get("phone") ?? ""));
  const code = toEnglishDigits(String(form.get("code") ?? "")).trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!phone) return { error: "شماره موبایل معتبر نیست." };
  if (!/^\d{4,6}$/.test(code)) return { error: "کد را کامل وارد کنید." };
  if (password.length < 8) return { error: "رمز عبور باید حداقل ۸ کاراکتر باشد." };
  if (password !== confirm) return { error: "تأیید رمز عبور با رمز واردشده مطابقت ندارد." };

  const result = await verifyOtp(phone, code);
  if (!result.ok) return { error: result.error };

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) return { error: "کاربری با این شماره یافت نشد." };

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  revalidatePath("/login");
  return { ok: true };
}
