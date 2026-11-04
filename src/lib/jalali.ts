import { toGregorian, toJalaali } from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function jalaliToDate(jy: number, jm: number, jd: number) {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return new Date(Date.UTC(gy, gm - 1, gd));
}

export function dateToJalali(date: Date) {
  return toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function ageFrom(birth: Date, now = new Date()) {
  let age = now.getFullYear() - birth.getUTCFullYear();
  const m = now.getMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getUTCDate())) age--;
  return age;
}

export function formatJalali(date: Date) {
  return date.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

export function currentJalaliYear() {
  return toJalaali(new Date()).jy;
}
