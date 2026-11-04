import type { ResultLevel } from "./types";

/** رنگ هر سطح شدت در گزارش‌ها (طیف ملایم، بدون قرمز تند) */
export const LEVEL_STYLES: Record<ResultLevel, { badge: string; bar: string; label: string }> = {
  normal: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-400", label: "طبیعی" },
  mild: { badge: "bg-lime-50 text-lime-700 border-lime-200", bar: "bg-lime-400", label: "خفیف" },
  moderate: { badge: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-400", label: "متوسط" },
  high: { badge: "bg-orange-50 text-orange-700 border-orange-200", bar: "bg-orange-400", label: "زیاد" },
  severe: { badge: "bg-rose-50 text-rose-700 border-rose-200", bar: "bg-rose-400", label: "شدید" },
};

export const NEUTRAL_STYLE = { badge: "bg-calm-50 text-calm-700 border-calm-200", bar: "bg-calm-500", label: "" };

export function levelStyle(level?: ResultLevel) {
  return level ? LEVEL_STYLES[level] : NEUTRAL_STYLE;
}
