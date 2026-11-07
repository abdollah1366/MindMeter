/**
 * ابزارهای گزارش پرسشنامه‌های چندمقیاسی (تست‌هایی که `scaleGroups` دارند).
 * بدون وابستگی به سرور، تا در صفحه‌ی نتیجه (کلاینت) و گزارش چاپی (سرور) استفاده شود.
 */
import type { PsychTest, ResultLevel, ResultPattern, ScaleScore } from "./types";
import { isStrengths, strengthsChips } from "./strengths";
import { toPersianDigits } from "./scoring";

export function isInventory(test: PsychTest) {
  return !!test.scaleGroups?.length;
}

const RANK: Record<ResultLevel, number> = { normal: 0, mild: 1, moderate: 2, high: 3, severe: 4 };

/** درصد نمره در بازه‌ی مقیاس؛ برای مقیاس‌های دوطرفه (مثل سوگیری درست/نادرست) فاصله از صفر */
export const percentOf = (s: ScaleScore) =>
  s.min < 0 ? Math.round((Math.abs(s.score) / (s.max || 1)) * 100) : Math.round(((s.score - s.min) / (s.max - s.min || 1)) * 100);

function groupOf(test: PsychTest, key: string) {
  const scale = test.scales.find((s) => s.key === key);
  return test.scaleGroups?.find((g) => g.key === scale?.group);
}

export type ValidityStatus = { level: "ok" | "caution" | "invalid"; flagged: ScaleScore[] };

/** وضعیت کلی اعتبار: اگر یکی از شاخص‌ها «severe» باشد نامعتبر، اگر «high» باشد احتیاط */
export function validityStatus(test: PsychTest, scores: ScaleScore[]): ValidityStatus {
  const v = scores.filter((s) => groupOf(test, s.key)?.validity);
  const flagged = v.filter((s) => RANK[s.result?.level ?? "normal"] >= RANK.high);
  const level = flagged.some((s) => s.result?.level === "severe") ? "invalid" : flagged.length ? "caution" : "ok";
  return { level, flagged };
}

export const VALIDITY_LABEL = {
  ok: { title: "پاسخ‌ها قابل تفسیر است", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  caution: { title: "نیم‌رخ با احتیاط تفسیر شود", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  invalid: { title: "نیم‌رخ قابل تفسیر نیست", tone: "border-rose-200 bg-rose-50 text-rose-800" },
} as const;

export function hasValidityGroup(test: PsychTest) {
  return !!test.scaleGroups?.some((g) => g.validity);
}

/** اولین قاعده‌ی «الگوی غالب» که با نمره‌ها جور است */
export function matchPattern(test: PsychTest, scores: ScaleScore[]): ResultPattern | null {
  const level = (key: string) => RANK[scores.find((s) => s.key === key)?.result?.level ?? "normal"];
  return (
    test.patterns?.find(
      (p) => (p.all ?? []).every((c) => level(c.scale) >= RANK[c.min]) && !(p.none ?? []).some((c) => level(c.scale) >= RANK[c.min]),
    ) ?? null
  );
}

/** مقیاس‌های محتوایی برجسته (بالا یا شدید)، به ترتیب شدت و درصد */
export function elevatedScales(test: PsychTest, scores: ScaleScore[]) {
  return scores
    .filter((s) => {
      const g = groupOf(test, s.key);
      return g && !g.validity && RANK[s.result?.level ?? "normal"] >= RANK.high;
    })
    .sort((a, b) => RANK[b.result!.level!] - RANK[a.result!.level!] || percentOf(b) - percentOf(a));
}

/** چند برچسب کوتاه برای فهرست نتایج (به جای نمایش همه‌ی مقیاس‌ها) */
export function headlineChips(test: PsychTest, scores: ScaleScore[], limit = 4): { key: string; text: string; level?: ResultLevel }[] {
  if (test.report === "bigfive")
    return scores.filter((s) => s.key.length === 1).map((s) => ({ key: s.key, text: `${s.title}: ${s.result?.title ?? ""}` }));
  if (isStrengths(test)) return strengthsChips(test, scores, Math.max(limit, 5)).map((c) => ({ key: c.key, text: toPersianDigits(c.text) }));
  const chips: { key: string; text: string; level?: ResultLevel }[] = [];
  if (hasValidityGroup(test)) {
    const v = validityStatus(test, scores);
    chips.push({ key: "validity", text: VALIDITY_LABEL[v.level].title, level: v.level === "ok" ? "normal" : v.level === "caution" ? "moderate" : "severe" });
  }
  const pattern = matchPattern(test, scores);
  if (pattern) chips.push({ key: "pattern", text: pattern.title, level: pattern.level });
  const top = elevatedScales(test, scores).filter((s) => groupOf(test, s.key)?.key !== "traits");
  for (const s of top.slice(0, limit)) chips.push({ key: s.key, text: `${s.title}: ${s.result?.title}`, level: s.result?.level });
  if (!top.length) chips.push({ key: "none", text: "مقیاس برجسته‌ای دیده نشد", level: "normal" });
  else if (top.length > limit) chips.push({ key: "more", text: `+${top.length - limit} مقیاس دیگر` });
  return chips;
}

export function inventorySummary(test: PsychTest, scores: ScaleScore[]) {
  if (test.report === "bigfive") return headlineChips(test, scores).map((c) => c.text).join("، ");
  if (isStrengths(test)) return "استعدادهای برتر: " + strengthsChips(test, scores).map((c) => c.text.replace(/^\d+\. /, "")).join("، ");
  return headlineChips(test, scores, 3)
    .map((c) => c.text)
    .join("، ");
}
