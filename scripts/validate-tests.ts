/**
 * بررسی سلامت داده‌ی تست‌ها: اجرا با `npm run validate:tests`
 * - هر سؤال به یک مقیاس معتبر تعلق دارد
 * - بازه‌های نتیجه‌ی هر مقیاس کل محدوده‌ی امتیاز را بدون فاصله و هم‌پوشانی می‌پوشانند
 * - نسخه‌های کوتاه/بلند به هم ارجاع می‌دهند
 */
import { tests, getTest } from "../src/data/tests";
import { scoreScale, scaleOf, inScale, optionsFor } from "../src/lib/scoring";

let errors = 0;
const fail = (msg: string) => {
  errors++;
  console.error("✗", msg);
};

for (const t of tests) {
  const keys = new Set(t.scales.map((s) => s.key));
  const ids = new Set<string>();
  for (const q of t.questions) {
    if (ids.has(q.id)) fail(`${t.slug}: duplicate id ${q.id}`);
    ids.add(q.id);
    if (!keys.has(scaleOf(t, q))) fail(`${t.slug}/${q.id}: unknown scale ${q.scale}`);
    const values = optionsFor(t, q).map((o) => o.value);
    if (new Set(values).size !== values.length) fail(`${t.slug}/${q.id}: duplicate option values`);
    if (q.answer !== undefined && !values.includes(q.answer)) fail(`${t.slug}/${q.id}: answer ${q.answer} is not an option`);
    if (q.figure && q.figure.cells.filter((c) => c === null).length !== 1) fail(`${t.slug}/${q.id}: matrix needs exactly one blank`);
  }
  for (const s of t.scales) {
    const { min, max } = scoreScale(t, s, {});
    const m = s.multiplier ?? 1;
    const sorted = [...s.results].sort((a, b) => a.min - b.min);
    if (sorted[0].min > min) fail(`${t.slug}/${s.key}: ranges start at ${sorted[0].min}, min is ${min}`);
    if (sorted.at(-1)!.max < max) fail(`${t.slug}/${s.key}: ranges end at ${sorted.at(-1)!.max}, max is ${max}`);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].min - sorted[i - 1].max;
      if (gap !== 1 && !(m > 1 && gap > 0 && gap <= m)) fail(`${t.slug}/${s.key}: gap/overlap between ranges ${i - 1} and ${i}`);
    }
    // هر امتیاز ممکن باید یک نتیجه داشته باشد
    for (let raw = min / m; raw <= max / m; raw++) {
      const score = raw * m;
      if (!s.results.some((r) => score >= r.min && score <= r.max)) fail(`${t.slug}/${s.key}: no result for score ${score}`);
    }
    for (const k of s.includes ?? []) if (!keys.has(k)) fail(`${t.slug}/${s.key}: includes unknown scale ${k}`);
    const count = t.questions.filter((q) => inScale(t, s, q)).length;
    console.log(`  ${t.code.padEnd(10)} ${s.key.padEnd(11)} items=${String(count).padStart(2)} range=${min}-${max}`);
  }
  if (t.version) {
    const pair = getTest(t.version.pairSlug);
    if (!pair || pair.version?.pairSlug !== t.slug) fail(`${t.slug}: version pair mismatch`);
  }
}

console.log(errors ? `\n${errors} error(s)` : `\n✓ ${tests.length} tests valid`);
process.exit(errors ? 1 : 0);
