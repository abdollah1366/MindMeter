import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export const OTP_LENGTH = 5;
const TTL_MS = 2 * 60 * 1000; // اعتبار کد: ۲ دقیقه
const RESEND_MS = 60 * 1000; // فاصله‌ی ارسال مجدد: ۱ دقیقه
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function hash(phone: string, code: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me")
    .update(`${phone}:${code}`)
    .digest("hex");
}

export type IssueResult = { ok: true; code: string } | { ok: false; error: string; retryAfter?: number };

export async function issueOtp(phone: string): Promise<IssueResult> {
  const now = Date.now();
  const recent = await db.otpCode.findMany({
    where: { phone, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_MS) {
    const retryAfter = Math.ceil((RESEND_MS - (now - recent[0].createdAt.getTime())) / 1000);
    return { ok: false, error: `لطفاً ${retryAfter} ثانیه‌ی دیگر دوباره تلاش کنید.`, retryAfter };
  }
  if (recent.length >= MAX_PER_HOUR) {
    return { ok: false, error: "تعداد درخواست‌ها زیاد است. لطفاً یک ساعت دیگر تلاش کنید." };
  }
  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  await db.otpCode.create({
    data: { phone, codeHash: hash(phone, code), expiresAt: new Date(now + TTL_MS) },
  });
  return { ok: true, code };
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const otp = await db.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "کد منقضی شده است. لطفاً کد جدید دریافت کنید." };
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است. کد جدید دریافت کنید." };
  }
  const a = Buffer.from(otp.codeHash, "hex");
  const b = Buffer.from(hash(phone, code), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "کد واردشده درست نیست." };
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
