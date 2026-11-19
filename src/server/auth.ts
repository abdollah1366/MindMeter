"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import {
  createSession,
  destroySession,
  isBootstrapAdmin,
  isBootstrapAdminUsername,
  isProfileComplete,
} from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sendOtpSms } from "@/lib/sms";
import { normalizeIranMobile, toEnglishDigits } from "@/lib/validation";

export type LoginState = {
  step: "phone" | "code";
  phone?: string;
  error?: string;
  info?: string;
};

export type CredentialsState = { error?: string };

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/my-results";
}

function normalizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/^@/, "");
}

/** ثبتنام آسان: تنها نام کاربری و رمز عبور لازم است؛ تکمیل پروفایل بلافاصله بعد از آن میآید */
export async function signUp(_: CredentialsState, form: FormData): Promise<CredentialsState> {
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    return { error: "نام کاربری باید ۳ تا ۳۰ حرف لاتین، عدد یا زیرخط باشد." };
  }
  if (password.length < 8) return { error: "رمز عبور باید حداقل ۸ کاراکتر باشد." };
  if (password !== confirm) return { error: "تأیید رمز عبور با رمز واردشده مطابقت ندارد." };

  if (await db.user.findUnique({ where: { username } })) {
    return { error: "این نام کاربری قبلاً انتخاب شده است. نام دیگری امتحان کنید." };
  }

  let user;
  try {
    user = await db.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        lastLoginAt: new Date(),
        ...(isBootstrapAdminUsername(username) ? { role: "ADMIN" } : {}),
      },
    });
  } catch {
    return { error: "این نام کاربری قبلاً انتخاب شده است. نام دیگری امتحان کنید." };
  }

  await createSession(user.id);
  redirect(`/profile?welcome=1&next=${encodeURIComponent(safeNext(form.get("next")))}`);
}

/** ورود با نام کاربری و رمز عبور */
export async function signIn(_: CredentialsState, form: FormData): Promise<CredentialsState> {
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!username) return { error: "نام کاربری را وارد کنید." };

  const user = await db.user.findUnique({ where: { username } });
  const passwordOk = await verifyPassword(password, user?.passwordHash);
  if (!user || !passwordOk) return { error: "نام کاربری یا رمز عبور نادرست است." };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);

  const next = safeNext(form.get("next"));
  if (!isProfileComplete(user)) redirect(`/profile?next=${encodeURIComponent(next)}`);
  redirect(next);
}

// ─────────────────────────────────────────────────────────────
// مسیر قدیمی ورود با پیامک — فعلاً از رابط کاربری حذف شده و تا زمان
// فعالسازی مجدد کاوهنگار به همان شکل نگه داشته میشود.
// ─────────────────────────────────────────────────────────────

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
    return { step: "phone", error: "ارسال پیامک با خطا روبرو شد. لطفاً دوباره تلاش کنید." };
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

  const admin = isBootstrapAdmin(phone);
  const user = await db.user.upsert({
    where: { phone },
    create: { phone, lastLoginAt: new Date(), ...(admin ? { role: "ADMIN" } : {}) },
    update: { lastLoginAt: new Date(), ...(admin ? { role: "ADMIN" } : {}) },
  });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
