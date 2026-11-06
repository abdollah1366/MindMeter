import type { PsychTest } from "@/lib/types";
import { MCPI_BASE, buildMcpi } from "./_mcpi";

const { questions, scales } = buildMcpi("short");

const test: PsychTest = {
  ...MCPI_BASE,
  slug: "mcpi-short",
  code: `MCPI-${questions.length}`,
  title: "پرسشنامه‌ی جامع شخصیت و سلامت روان (نسخه‌ی کوتاه)",
  shortDescription: `نسخه‌ی کوتاه پرسشنامه‌ی جامع مایندمتر با ${questions.length} سؤال؛ همان ساختار لایه‌ای با زمان کمتر و دقت کمتر در هر مقیاس.`,
  estimatedMinutes: 15,
  version: { kind: "short", pairSlug: "mcpi-long" },
  questions,
  scales,
};

export default test;
