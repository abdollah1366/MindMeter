/**
 * بارگذاری پرسشنامه‌های دارای مجوز تجاری (مثلاً نسخه‌ای از یک آزمون که مجوز اجرای آن را خریده‌اید).
 *
 * محتوای این آزمون‌ها نباید در مخزن گیت منتشر شود؛ فایل‌های JSON را در پوشه‌ی
 * `licensed-tests/` (یا مسیر LICENSED_TESTS_DIR) روی سرور بگذارید. این پوشه در .gitignore است.
 * ساختار هر فایل همان `PsychTest` است (راهنما: licensed-tests/README.md).
 * این تست‌ها به‌طور پیش‌فرض «محدود» هستند: در فهرست‌ها و نقشه‌ی سایت نمی‌آیند و فقط با ورود قابل اجرا هستند.
 */
import fs from "node:fs";
import path from "node:path";
import type { PsychTest } from "@/lib/types";
import { validateTest } from "@/lib/validate-test";

export type LicensedLoadError = { file: string; errors: string[] };

export function loadLicensedTests(existing: PsychTest[]): { tests: PsychTest[]; errors: LicensedLoadError[] } {
  // turbopackIgnore: این پوشه در زمان اجرا روی سرور خوانده می‌شود و نباید در باندل ردیابی شود
  const dir = process.env.LICENSED_TESTS_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "licensed-tests");
  const out: PsychTest[] = [];
  const errors: LicensedLoadError[] = [];
  let files: string[] = [];
  try {
    files = fs.readdirSync(/* turbopackIgnore: true */ dir).filter((f) => f.endsWith(".json") && !f.endsWith(".sample.json"));
  } catch {
    return { tests: out, errors };
  }
  for (const file of files.sort()) {
    try {
      const t = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ path.join(dir, file), "utf8")) as PsychTest;
      const taken = [...existing, ...out].some((x) => x.slug === t.slug);
      const problems = taken ? [`slug «${t.slug}» is already used`] : validateTest(t, [...existing, ...out, t]);
      if (problems.length) {
        errors.push({ file, errors: problems.slice(0, 20) });
        continue;
      }
      out.push({ ...t, restricted: t.restricted ?? true, licensed: true });
    } catch (e) {
      errors.push({ file, errors: [`invalid JSON: ${(e as Error).message}`] });
    }
  }
  return { tests: out, errors };
}
