/**
 * بررسی سلامت تعریف یک تست. هم در `npm run validate:tests` و هم هنگام بارگذاری
 * پرسشنامه‌های مجوزدار از فایل JSON استفاده می‌شود.
 */
import type { PsychTest } from "./types";
import { inScale, optionsFor, scaleOf, scoreScale } from "./scoring";

export function validateTest(t: PsychTest, all: PsychTest[] = []): string[] {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(`${t.slug}: ${msg}`);

  if (!t.slug || !/^[a-z0-9-]{2,60}$/.test(t.slug)) fail("slug must be lowercase letters, digits and dashes");
  if (!Array.isArray(t.questions) || !t.questions.length) fail("needs questions");
  if (!Array.isArray(t.scales) || !t.scales.length) fail("needs scales");
  if (!Array.isArray(t.options)) fail("needs options");
  if (errors.length) return errors;

  const keys = new Set(t.scales.map((s) => s.key));
  const ids = new Set<string>();
  for (const q of t.questions) {
    if (ids.has(q.id)) fail(`duplicate id ${q.id}`);
    ids.add(q.id);
    if (!keys.has(scaleOf(t, q)) && !t.scales.some((s) => s.items)) fail(`${q.id}: unknown scale ${q.scale}`);
    const values = optionsFor(t, q).map((o) => o.value);
    if (!values.length) fail(`${q.id}: no options`);
    if (new Set(values).size !== values.length) fail(`${q.id}: duplicate option values`);
    if (q.answer !== undefined && !values.includes(q.answer)) fail(`${q.id}: answer ${q.answer} is not an option`);
    if (t.kind === "ability") {
      const real = optionsFor(t, q).filter((o) => o.value >= 0);
      if (real.length < 4) fail(`${q.id}: ability item needs at least 4 options`);
      if (!q.level) fail(`${q.id}: ability item needs a level`);
      if (q.answer === undefined) fail(`${q.id}: ability item needs an answer`);
      const key = (o: (typeof real)[number]) => (o.figure ? JSON.stringify(o.figure) : o.label);
      if (new Set(real.map(key)).size !== real.length) fail(`${q.id}: two options look identical`);
    }
    if (q.figure && q.figure.cells.filter((c) => c === null).length !== 1) fail(`${q.id}: matrix needs exactly one blank`);
  }

  for (const s of t.scales) {
    if (!Array.isArray(s.results) || !s.results.length) {
      fail(`${s.key}: needs result ranges`);
      continue;
    }
    for (const k of s.includes ?? []) if (!keys.has(k)) fail(`${s.key}: includes unknown scale ${k}`);
    for (const it of s.items ?? []) if (!ids.has(it.id)) fail(`${s.key}: keyed item ${it.id} does not exist`);
    for (const [a, b] of s.pairs ?? []) if (!ids.has(a) || !ids.has(b)) fail(`${s.key}: pair ${a}/${b} refers to a missing item`);
    if ((s.method === "inconsistency" || s.method === "acquiescence") && !s.pairs?.length) fail(`${s.key}: ${s.method} needs pairs`);
    if (s.group && t.scaleGroups && s.group !== "hidden" && !t.scaleGroups.some((g) => g.key === s.group)) fail(`${s.key}: unknown group ${s.group}`);

    const { min, max } = scoreScale(t, s, {});
    const m = s.multiplier ?? 1;
    const sorted = [...s.results].sort((a, b) => a.min - b.min);
    if (sorted[0].min > min) fail(`${s.key}: ranges start at ${sorted[0].min}, min is ${min}`);
    if (sorted.at(-1)!.max < max) fail(`${s.key}: ranges end at ${sorted.at(-1)!.max}, max is ${max}`);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].min - sorted[i - 1].max;
      if (gap !== 1 && !(m > 1 && gap > 0 && gap <= m)) fail(`${s.key}: gap/overlap between ranges ${i - 1} and ${i}`);
    }
    for (let raw = min / m; raw <= max / m; raw++) {
      const score = raw * m;
      if (!s.results.some((r) => score >= r.min && score <= r.max)) fail(`${s.key}: no result for score ${score}`);
    }
  }

  if (t.version) {
    const pair = all.find((x) => x.slug === t.version!.pairSlug);
    if (!pair || pair.version?.pairSlug !== t.slug) fail("version pair mismatch");
  }
  return errors;
}

/** شمار سؤال‌های هر مقیاس (برای گزارش اسکریپت) */
export function scaleItemCount(t: PsychTest, key: string) {
  const s = t.scales.find((x) => x.key === key)!;
  return t.questions.filter((q) => inScale(t, s, q)).length;
}
