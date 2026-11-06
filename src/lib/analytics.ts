import "server-only";
import { createHash } from "node:crypto";

export const TRACKED_KINDS = ["view", "test_start", "test_complete"] as const;

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|preview|python|curl|wget|axios|node-fetch|go-http/i;

export function isBot(ua: string) {
  return !ua || BOT.test(ua);
}

export function deviceOf(ua: string) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** هش روزانه: از IP و مرورگر فقط یک شناسه‌ی یک‌روزه ساخته می‌شود و خود IP ذخیره نمی‌شود */
export function visitorHash(ip: string, ua: string, day = new Date().toISOString().slice(0, 10)) {
  const salt = process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me";
  return createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("base64url").slice(0, 22);
}

export function referrerHost(ref: string | null | undefined, ownHost: string) {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    if (!h || h === ownHost.replace(/^www\./, "").split(":")[0]) return null;
    return h.slice(0, 100);
  } catch {
    return null;
  }
}

/** مسیرهایی که شمرده نمی‌شوند */
export function isPrivatePath(path: string) {
  return /^\/(admin|api|_next|panel|visit|pay|reports)(\/|$)/.test(path);
}

/** نام خوانا برای منبع ورود */
export function sourceLabel(host: string | null) {
  if (!host) return "مستقیم";
  if (/google\./.test(host)) return "گوگل";
  if (/bing\./.test(host)) return "بینگ";
  if (/(^|\.)t\.me$|telegram/.test(host)) return "تلگرام";
  if (/instagram/.test(host)) return "اینستاگرام";
  if (/(^|\.)(x|twitter|t)\.co(m)?$/.test(host)) return "ایکس (توییتر)";
  if (/linkedin/.test(host)) return "لینکدین";
  if (/yandex/.test(host)) return "یاندکس";
  if (/duckduckgo/.test(host)) return "داک‌داک‌گو";
  return host;
}
