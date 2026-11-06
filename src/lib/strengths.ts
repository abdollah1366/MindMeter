import type { PsychTest, ScaleScore } from "./types";

export type RankedTalent = ScaleScore & {
  rank: number;
  domain: string;
  domainTitle: string;
  description?: string;
  careers: string[];
  percent: number;
};

/** رنگ ثابت هر حوزه (کلاس‌های کامل تا Tailwind آن‌ها را بسازد) */
export const DOMAIN_STYLE: Record<string, { chip: string; bar: string; card: string }> = {
  exec: { chip: "bg-violet-50 text-violet-700 border-violet-200", bar: "bg-violet-400", card: "border-violet-200 bg-violet-50/60" },
  infl: { chip: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-400", card: "border-amber-200 bg-amber-50/60" },
  rel: { chip: "bg-sky-50 text-sky-700 border-sky-200", bar: "bg-sky-400", card: "border-sky-200 bg-sky-50/60" },
  strat: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-400", card: "border-emerald-200 bg-emerald-50/60" },
};
const FALLBACK = { chip: "bg-slate-50 text-slate-700 border-slate-200", bar: "bg-slate-400", card: "border-slate-200 bg-slate-50" };
export const domainStyle = (key: string) => DOMAIN_STYLE[key] ?? FALLBACK;

export function isStrengths(test: PsychTest) {
  return test.report === "strengths";
}

/** رتبه‌بندی همه‌ی استعدادها از قوی‌ترین تا ضعیف‌ترین (تساوی: ترتیب تعریف) */
export function rankTalents(test: PsychTest, scores: ScaleScore[]): RankedTalent[] {
  const order = new Map(test.scales.map((s, i) => [s.key, i]));
  return scores
    .map((s) => {
      const scale = test.scales.find((x) => x.key === s.key);
      const group = test.scaleGroups?.find((g) => g.key === scale?.group);
      return {
        ...s,
        rank: 0,
        domain: scale?.group ?? "",
        domainTitle: group?.title ?? "",
        description: scale?.description,
        careers: scale?.careers ?? [],
        percent: s.max > s.min ? Math.round(((s.score - s.min) / (s.max - s.min)) * 100) : 0,
      };
    })
    .sort((a, b) => b.score - a.score || (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

/** سهم هر حوزه: میانگین درصد استعدادها و تعداد حضور در ۵ و ۱۰ برتر */
export function domainBalance(test: PsychTest, ranked: RankedTalent[]) {
  return (test.scaleGroups ?? [])
    .map((g) => {
      const items = ranked.filter((t) => t.domain === g.key);
      const avg = items.length ? Math.round(items.reduce((s, t) => s + t.percent, 0) / items.length) : 0;
      return {
        key: g.key,
        title: g.title,
        description: g.description,
        percent: avg,
        inTop5: items.filter((t) => t.rank <= 5).length,
        inTop10: items.filter((t) => t.rank <= 10).length,
      };
    })
    .sort((a, b) => b.inTop5 - a.inTop5 || b.percent - a.percent);
}

/** شغل‌های پیشنهادی: هرچه شغلی در استعدادهای برتر بیشتر و بالاتر تکرار شود، امتیاز بیشتری دارد */
export function suggestedCareers(ranked: RankedTalent[], top = 5, limit = 12) {
  const score = new Map<string, { weight: number; from: string[] }>();
  for (const t of ranked.slice(0, top)) {
    t.careers.forEach((c, i) => {
      const e = score.get(c) ?? { weight: 0, from: [] };
      e.weight += top + 1 - t.rank + (t.careers.length - i) / 10;
      e.from.push(t.title);
      score.set(c, e);
    });
  }
  return [...score.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, limit)
    .map(([title, e]) => ({ title, from: e.from }));
}

/** برچسب‌های کوتاه: ۵ استعداد برتر */
export function strengthsChips(test: PsychTest, scores: ScaleScore[], limit = 5) {
  return rankTalents(test, scores)
    .slice(0, limit)
    .map((t) => ({ key: t.key, text: `${t.rank}. ${t.title}`, domain: t.domain }));
}
