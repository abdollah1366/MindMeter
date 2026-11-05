import "server-only";
import { db } from "@/lib/db";
import { ageFrom } from "@/lib/jalali";
import type { ScaleScore } from "@/lib/types";

/** گروه‌های سنی برای هنجار */
export const AGE_BANDS: [number, number][] = [
  [6, 11],
  [12, 15],
  [16, 19],
  [20, 29],
  [30, 39],
  [40, 49],
  [50, 59],
  [60, 120],
];
/** حداقل تعداد شرکت‌کننده برای اینکه یک گروه به‌تنهایی قابل اتکا باشد */
export const MIN_GROUP = 30;
/** کمتر از این، هیچ مقایسه‌ای نمایش داده نمی‌شود */
export const MIN_ANY = 5;

export const SEX_GROUP_LABEL: Record<string, string> = { MALE: "مردان", FEMALE: "زنان", ALL: "زنان و مردان" };

export function ageBand(age: number) {
  return AGE_BANDS.find(([a, b]) => age >= a && age <= b) ?? null;
}

export function bandLabel([a, b]: [number, number]) {
  return b >= 120 ? `${a} سال به بالا` : `${a} تا ${b} سال`;
}

type Sample = { userId: string; age: number | null; sex: string | null; scores: Record<string, number> };

/** نخستین نتیجه‌ی هر کاربر (برای حذف اثر تمرین در دفعات بعد) */
export async function participantSamples(testSlug: string): Promise<Sample[]> {
  const rows = await db.testResult.findMany({
    where: { testSlug },
    orderBy: { createdAt: "asc" },
    select: { userId: true, scores: true, createdAt: true, user: { select: { birthDate: true, sex: true } } },
  });
  const seen = new Set<string>();
  const out: Sample[] = [];
  for (const r of rows) {
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    const scores = Object.fromEntries((JSON.parse(r.scores) as ScaleScore[]).map((s) => [s.key, s.score]));
    out.push({
      userId: r.userId,
      age: r.user.birthDate ? ageFrom(r.user.birthDate, r.createdAt) : null,
      sex: r.user.sex,
      scores,
    });
  }
  return out;
}

export function stats(values: number[]) {
  const n = values.length;
  const mean = n ? values.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, mean, sd };
}

/** صدک: درصد افرادی که نمره‌ی کمتر گرفته‌اند (نیمی از هم‌نمره‌ها هم شمرده می‌شود) */
export function percentileRank(x: number, values: number[]) {
  if (!values.length) return null;
  const below = values.filter((v) => v < x).length;
  const equal = values.filter((v) => v === x).length;
  return Math.round(((below + equal / 2) / values.length) * 100);
}

/** نمره‌ی استاندارد با میانگین ۱۰۰ و انحراف معیار ۱۵ */
export function standardScore(x: number, mean: number, sd: number) {
  if (!(sd > 0)) return null;
  return Math.max(40, Math.min(160, Math.round(100 + (15 * (x - mean)) / sd)));
}

/** تابع توزیع نرمال استاندارد (تقریب Abramowitz–Stegun) */
export function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function standardLabel(ss: number) {
  if (ss >= 130) return "بسیار بالاتر از میانگین";
  if (ss >= 120) return "بالاتر از میانگین";
  if (ss >= 110) return "کمی بالاتر از میانگین";
  if (ss >= 90) return "در محدوده‌ی میانگین";
  if (ss >= 80) return "کمی پایین‌تر از میانگین";
  if (ss >= 70) return "پایین‌تر از میانگین";
  return "بسیار پایین‌تر از میانگین";
}

export type ScaleComparison = { key: string; title: string; score: number; percentile: number | null; standard: number | null; mean: number; sd: number };
export type NormComparison = {
  kind: "participants" | "official";
  groupLabel: string;
  n: number;
  /** وقتی گروه هم‌سن و هم‌جنس کم‌جمعیت بوده و گروه بزرگ‌تری استفاده شده */
  fallbackNote?: string;
  source?: string;
  scales: ScaleComparison[];
};
export type NormReport = {
  needsProfile: boolean;
  age: number | null;
  sex: string | null;
  participants: NormComparison | null;
  participantsTotal: number;
  official: NormComparison | null;
};

/** مقایسه‌ی یک نتیجه با شرکت‌کنندگان سایت و با هنجار داخلی ثبت‌شده */
export async function buildNormReport(resultId: string): Promise<NormReport | null> {
  const result = await db.testResult.findUnique({ where: { id: resultId }, include: { user: true } });
  if (!result) return null;
  const scores = JSON.parse(result.scores) as ScaleScore[];
  const age = result.user.birthDate ? ageFrom(result.user.birthDate, result.createdAt) : null;
  const sex = result.user.sex === "MALE" || result.user.sex === "FEMALE" ? result.user.sex : null;
  const band = age != null ? ageBand(age) : null;

  // ── شرکت‌کنندگان سایت ──
  const others = (await participantSamples(result.testSlug)).filter((s) => s.userId !== result.userId);
  const candidates: { label: string; rows: Sample[]; note?: string }[] = [];
  if (band && sex)
    candidates.push({
      label: `${SEX_GROUP_LABEL[sex]} ${bandLabel(band)}`,
      rows: others.filter((s) => s.sex === sex && s.age != null && s.age >= band[0] && s.age <= band[1]),
    });
  if (band)
    candidates.push({
      label: `زنان و مردان ${bandLabel(band)}`,
      rows: others.filter((s) => s.age != null && s.age >= band[0] && s.age <= band[1]),
      note: sex ? "تعداد شرکت‌کنندگان هم‌سن و هم‌جنس شما هنوز کم است؛ مقایسه با همه‌ی هم‌سن‌ها انجام شد." : undefined,
    });
  if (sex) candidates.push({ label: `همه‌ی ${SEX_GROUP_LABEL[sex]}`, rows: others.filter((s) => s.sex === sex), note: "گروه سنی شما هنوز کم‌جمعیت است." });
  candidates.push({ label: "همه‌ی شرکت‌کنندگان", rows: others, note: "گروه سنی و جنسی شما هنوز کم‌جمعیت است؛ مقایسه با همه‌ی شرکت‌کنندگان انجام شد." });

  const chosen = candidates.find((c) => c.rows.length >= MIN_GROUP) ?? candidates.find((c) => c.rows.length >= MIN_ANY) ?? null;
  const participants: NormComparison | null = chosen
    ? {
        kind: "participants",
        groupLabel: chosen.label,
        n: chosen.rows.length,
        fallbackNote: chosen === candidates[0] ? undefined : chosen.note,
        scales: scores.map((s) => {
          const values = chosen.rows.map((r) => r.scores[s.key]).filter((v): v is number => typeof v === "number");
          const st = stats(values);
          return {
            key: s.key,
            title: s.title,
            score: s.score,
            percentile: percentileRank(s.score, values),
            standard: standardScore(s.score, st.mean, st.sd),
            mean: st.mean,
            sd: st.sd,
          };
        }),
      }
    : null;

  // ── هنجار داخلی ثبت‌شده ──
  let official: NormComparison | null = null;
  if (age != null) {
    const norms = await db.testNorm.findMany({ where: { testSlug: result.testSlug, ageMin: { lte: age }, ageMax: { gte: age } } });
    const pick = (key: string) =>
      norms.find((n) => n.scaleKey === key && n.sex === sex) ?? norms.find((n) => n.scaleKey === key && n.sex === "ALL");
    const rows = scores.map((s) => ({ s, norm: pick(s.key) })).filter((x) => x.norm);
    if (rows.length) {
      const first = rows[0].norm!;
      official = {
        kind: "official",
        groupLabel: `${SEX_GROUP_LABEL[first.sex] ?? ""} ${bandLabel([first.ageMin, first.ageMax])}`.trim(),
        n: first.n,
        source: first.source,
        scales: rows.map(({ s, norm }) => {
          const ss = standardScore(s.score, norm!.mean, norm!.sd);
          return {
            key: s.key,
            title: s.title,
            score: s.score,
            standard: ss,
            percentile: norm!.sd > 0 ? Math.round(normalCdf((s.score - norm!.mean) / norm!.sd) * 100) : null,
            mean: norm!.mean,
            sd: norm!.sd,
          };
        }),
      };
    }
  }

  return { needsProfile: age == null || !sex, age, sex, participants, participantsTotal: others.length + 1, official };
}
