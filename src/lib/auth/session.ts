import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { normalizeIranMobile } from "@/lib/validation";

const COOKIE = "mm_session";
const MAX_AGE = 60 * 60 * 24 * 30; // ۳۰ روز

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** شناسه‌ی کاربر واردشده، یا null */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * شماره‌هایی که در ADMIN_PHONES تعریف شده‌اند ادمین هستند.
 * شماره‌ها نرمال می‌شوند، پس 0914…، +98914… یا ارقام فارسی همه پذیرفته می‌شوند.
 */
export function isBootstrapAdmin(phone: string) {
  return (process.env.ADMIN_PHONES ?? "")
    .split(/[,،]/)
    .map((p) => normalizeIranMobile(p.replace(/["']/g, "")))
    .includes(phone);
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id } });
  // اگر شماره بعد از ورود به ADMIN_PHONES اضافه شده باشد، نیازی به خروج و ورود دوباره نیست
  if (user && user.role !== "ADMIN" && isBootstrapAdmin(user.phone)) {
    return db.user.update({ where: { id }, data: { role: "ADMIN" } });
  }
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** آیا اطلاعات لازم برای چاپ گزارش کامل است؟ */
export function isProfileComplete(u: CurrentUser) {
  return Boolean(u.firstName && u.lastName && u.nationalId && u.birthDate && u.sex);
}
