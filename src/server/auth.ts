"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession, destroySession } from "@/lib/auth/session";
import { sendOtpSms } from "@/lib/sms";
import { normalizeIranMobile, toEnglishDigits } from "@/lib/validation";

export type LoginState = {
  step: "phone" | "code";
  phone?: string;
  error?: string;
  info?: string;
};

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/my-results";
}

export async function requestCode(_: LoginState, form: FormData): Promise<LoginState> {
  const phone = normalizeIranMobile(String(form.get("phone") ?? ""));
  if (!phone) return { step: "phone", error: "شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۱۲۳۴۵۶۷" };

  const issued = await issueOtp(phone);
  if (!issued.ok) {
    // اگر کد قبلی هنوز معتبر است کاربر را به مرحله‌ی وارد کردن کد ببریم
    return issued.retryAfter ? { step: "code", phone, error: issued.error } : { step: "phone", error: issued.error };
  }
  try {
    await sendOtpSms(phone, issued.code);
  } catch (e) {
    console.error(e);
    return { step: "phone", error: "ارسال پیامک با خطا روبه‌رو شد. لطفاً دوباره تلاش کنید." };
  }
  return { step: "code", phone, info: "کد تأیید برای شما پیامک شد." };
}

export async function verifyCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const phone = normalizeIranMobile(String(form.get("phone") ?? ""));
  const code = toEnglishDigits(String(form.get("code") ?? "")).trim();
  if (!phone) return { step: "phone", error: "شماره موبایل معتبر نیست." };
  if (!/^\d{4,6}$/.test(code)) return { ...prev, step: "code", phone, error: "کد را کامل وارد کنید." };

  const result = await verifyOtp(phone, code);
  if (!result.ok) return { step: "code", phone, error: result.error };

  const user = await db.user.upsert({
    where: { phone },
    create: { phone, lastLoginAt: new Date() },
    update: { lastLoginAt: new Date() },
  });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
