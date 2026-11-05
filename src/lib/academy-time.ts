import { toGregorian, toJalaali } from "jalaali-js";
import { TEHRAN_OFFSET_MIN, tehranParts, minuteToHHMM, hhmmToMinute } from "./tehran-time";
import { toEnglishDigits } from "./validation";

/**
 * «۱۴۰۵/۰۸/۲۰ ۱۸:۳۰» (شمسی) یا «2026-11-10 18:30» (میلادی) به وقت تهران → Date
 */
export function parseTehranDateTime(raw: string): Date | null {
  const s = toEnglishDigits(raw).trim().replace(/\s+/g, " ");
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}:\d{2}))?$/.exec(s);
  if (!m) return null;
  let [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (y < 1700) {
    const g = toGregorian(y, mo, d);
    [y, mo, d] = [g.gy, g.gm, g.gd];
  }
  const minute = m[4] ? hhmmToMinute(m[4]) : 0;
  if (minute == null) return null;
  const t = Date.UTC(y, mo - 1, d) + (minute - TEHRAN_OFFSET_MIN) * 60_000;
  return Number.isNaN(t) ? null : new Date(t);
}

/** Date → «1405/08/20 18:30» برای فیلد ویرایش */
export function formatTehranInput(d: Date | null | undefined) {
  if (!d) return "";
  const p = tehranParts(d);
  const j = toJalaali(p.y, p.m + 1, p.day);
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")} ${minuteToHHMM(p.minute)}`;
}
