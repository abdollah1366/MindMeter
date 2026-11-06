/**
 * بررسی سلامت داده‌ی تست‌ها: اجرا با `npm run validate:tests`
 * - هر سؤال به یک مقیاس معتبر تعلق دارد
 * - بازه‌های نتیجه‌ی هر مقیاس کل محدوده‌ی امتیاز را بدون فاصله و هم‌پوشانی می‌پوشانند
 * - جفت‌سؤال‌های شاخص‌های اعتبار و کلیدهای صریح به سؤال‌های موجود اشاره می‌کنند
 * - نسخه‌های کوتاه/بلند به هم ارجاع می‌دهند
 * پرسشنامه‌های مجوزدار پوشه‌ی licensed-tests هم بررسی می‌شوند.
 */
import { tests, licensedLoadErrors } from "../src/data/tests";
import { validateTest, scaleItemCount } from "../src/lib/validate-test";
import { scoreScale } from "../src/lib/scoring";

let errors = 0;
for (const t of tests) {
  for (const e of validateTest(t, tests)) {
    errors++;
    console.error("✗", e);
  }
  for (const s of t.scales) {
    const { min, max } = scoreScale(t, s, {});
    console.log(`  ${t.code.padEnd(10)} ${s.key.padEnd(11)} items=${String(scaleItemCount(t, s.key)).padStart(2)} range=${min}-${max}`);
  }
}
for (const f of licensedLoadErrors) {
  for (const e of f.errors) {
    errors++;
    console.error("✗", `${f.file}: ${e}`);
  }
}

console.log(errors ? `\n${errors} error(s)` : `\n✓ ${tests.length} tests valid`);
process.exit(errors ? 1 : 0);
