import type { BuiltInNormGroup, PsychTest, ScaleScore } from "./types";

/** گروه هنجار مناسب بر اساس سن و جنس؛ وقتی جنس معلوم نیست، میانگین هنجار زنان و مردان */
export function pickNorm(test: PsychTest, sex?: string | null, age?: number | null) {
  const groups = test.builtInNorms?.groups ?? [];
  if (!groups.length) return null;
  const a = age ?? 30;
  const inAge = groups.filter((g) => a >= g.ageMin && a <= g.ageMax);
  const pool = inAge.length ? inAge : groups.filter((g) => g.ageMin <= 30 && g.ageMax >= 30);
  const exact = sex === "MALE" || sex === "FEMALE" ? pool.find((g) => g.sex === sex) : undefined;
  const missing = [age == null && "سن", !exact && "جنس"].filter(Boolean) as string[];
  if (exact) return { group: exact, label: exact.label, missing };
  // هنجار ترکیبی: میانگین زنان و مردان همان گروه سنی
  const values: BuiltInNormGroup["values"] = {};
  const keys = Object.keys(pool[0].values);
  for (const k of keys) {
    const vs = pool.map((g) => g.values[k]).filter(Boolean);
    values[k] = { mean: vs.reduce((s, v) => s + v.mean, 0) / vs.length, sd: vs.reduce((s, v) => s + v.sd, 0) / vs.length };
  }
  const ageLabel = pool[0].label.replace(/^(مردان|زنان)\s*/, "");
  return { group: { ...pool[0], values }, label: `زنان و مردان ${ageLabel}`, missing };
}

function erf(x: number) {
  // تقریب Abramowitz–Stegun
  const s = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const cdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

export type TraitLevel = "vlow" | "low" | "mid" | "high" | "vhigh";
export const LEVEL_TITLE: Record<TraitLevel, string> = { vlow: "خیلی پایین", low: "پایین", mid: "متوسط", high: "بالا", vhigh: "خیلی بالا" };
export const LEVEL_TONE: Record<TraitLevel, { badge: string; bar: string }> = {
  vlow: { badge: "bg-sky-50 text-sky-700 border-sky-200", bar: "bg-sky-500" },
  low: { badge: "bg-sky-50 text-sky-700 border-sky-200", bar: "bg-sky-400" },
  mid: { badge: "bg-slate-50 text-slate-600 border-slate-200", bar: "bg-slate-400" },
  high: { badge: "bg-violet-50 text-violet-700 border-violet-200", bar: "bg-violet-400" },
  vhigh: { badge: "bg-violet-50 text-violet-700 border-violet-200", bar: "bg-violet-500" },
};
export function levelOfT(t: number): TraitLevel {
  return t < 35 ? "vlow" : t < 45 ? "low" : t <= 55 ? "mid" : t <= 65 ? "high" : "vhigh";
}
/** سطح سه‌گانه برای انتخاب متن تفسیر */
export const band3 = (l: TraitLevel) => (l === "vlow" || l === "low" ? "low" : l === "mid" ? "mid" : "high");

export type TraitScore = ScaleScore & { t: number; percentile: number; level: TraitLevel; group: string };

/** نمره‌ی T و صدک هر مقیاس با هنجار انتخاب‌شده */
export function bigFiveScores(test: PsychTest, scores: ScaleScore[], sex?: string | null, age?: number | null) {
  const norm = pickNorm(test, sex, age);
  const traits: TraitScore[] = scores.map((s) => {
    const n = norm?.group.values[s.key];
    const z = n && n.sd > 0 ? (s.score - n.mean) / n.sd : 0;
    const t = Math.round(Math.max(20, Math.min(80, 50 + 10 * z)));
    return {
      ...s,
      t,
      percentile: Math.max(1, Math.min(99, Math.round(cdf(z) * 100))),
      level: levelOfT(t),
      group: test.scales.find((x) => x.key === s.key)?.group ?? "",
    };
  });
  return { norm, traits };
}
