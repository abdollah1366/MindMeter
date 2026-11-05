/**
 * ابزار زمان به وقت تهران.
 * ایران از سال ۱۴۰۱ ساعت تابستانی ندارد و همیشه UTC+03:30 است.
 */
export const TEHRAN_OFFSET_MIN = 210;
const MS = 60 * 1000;

export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/** اجزای تاریخ به وقت تهران؛ weekday: ۰ = شنبه */
export function tehranParts(d: Date) {
  const t = new Date(d.getTime() + TEHRAN_OFFSET_MIN * MS);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth(),
    day: t.getUTCDate(),
    weekday: (t.getUTCDay() + 1) % 7,
    minute: t.getUTCHours() * 60 + t.getUTCMinutes(),
  };
}

/** نیمه‌شب تهران برای روزی که `d` در آن قرار دارد، به اضافه‌ی چند روز */
export function tehranMidnight(d: Date, addDays = 0) {
  const p = tehranParts(d);
  return new Date(Date.UTC(p.y, p.m, p.day + addDays) - TEHRAN_OFFSET_MIN * MS);
}

export function minuteToHHMM(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinute(s: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v <= 24 * 60 ? v : null;
}

export function formatTehran(d: Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "short" }) {
  return d.toLocaleString("fa-IR", { timeZone: "Asia/Tehran", ...opts });
}

export function formatTehranTime(d: Date) {
  return d.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });
}

export function formatToman(n: number) {
  return n === 0 ? "رایگان" : `${n.toLocaleString("fa-IR")} تومان`;
}
