"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { participantSamples, stats, MIN_GROUP } from "@/lib/norms";
import { getTest } from "@/data/tests";
import { toEnglishDigits } from "@/lib/validation";

const num = (v: FormDataEntryValue | null) => Number(toEnglishDigits(String(v ?? "")).trim());

/** ثبت دستی یک ردیف هنجار داخلی (مثلاً از یک پژوهش هنجاریابی) */
export async function addNorm(form: FormData) {
  await requireAdmin();
  const testSlug = String(form.get("testSlug") ?? "");
  const test = getTest(testSlug);
  const scaleKey = String(form.get("scaleKey") ?? "total");
  const sex = String(form.get("sex") ?? "ALL");
  const [ageMin, ageMax, mean, sd, n] = ["ageMin", "ageMax", "mean", "sd", "n"].map((k) => num(form.get(k)));
  const source = String(form.get("source") ?? "").trim().slice(0, 300);
  if (!test || !test.scales.some((s) => s.key === scaleKey) || !["ALL", "MALE", "FEMALE"].includes(sex)) return;
  if (![ageMin, ageMax, mean, sd].every(Number.isFinite) || ageMin > ageMax || sd <= 0 || !source) return;
  await db.testNorm.create({ data: { testSlug, scaleKey, sex, ageMin, ageMax, mean, sd, n: Number.isFinite(n) ? n : 0, source } });
  revalidatePath("/admin/norms");
}

export async function deleteNorm(form: FormData) {
  await requireAdmin();
  await db.testNorm.deleteMany({ where: { id: String(form.get("id") ?? "") } });
  revalidatePath("/admin/norms");
}

/** تبدیل آمار شرکت‌کنندگان یک گروه به هنجار داخلی (برای همه‌ی مقیاس‌های تست) */
export async function adoptParticipantNorm(form: FormData) {
  await requireAdmin();
  const testSlug = String(form.get("testSlug") ?? "");
  const test = getTest(testSlug);
  const sex = String(form.get("sex") ?? "ALL");
  const ageMin = num(form.get("ageMin"));
  const ageMax = num(form.get("ageMax"));
  if (!test) return;
  const rows = (await participantSamples(testSlug)).filter(
    (s) => s.age != null && s.age >= ageMin && s.age <= ageMax && (sex === "ALL" || s.sex === sex),
  );
  if (rows.length < MIN_GROUP) return;
  const date = new Date().toLocaleDateString("fa-IR");
  await db.$transaction([
    db.testNorm.deleteMany({ where: { testSlug, sex, ageMin, ageMax } }),
    ...test.scales.map((s) => {
      const st = stats(rows.map((r) => r.scores[s.key]).filter((v): v is number => typeof v === "number"));
      return db.testNorm.create({
        data: { testSlug, scaleKey: s.key, sex, ageMin, ageMax, mean: st.mean, sd: st.sd || 1, n: st.n, source: `شرکت‌کنندگان مایندمتر تا ${date}` },
      });
    }),
  ]);
  revalidatePath("/admin/norms");
}
