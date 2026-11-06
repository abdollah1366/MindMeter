import type { PsychTest } from "@/lib/types";
import { MCPI_BASE, buildMcpi } from "./_mcpi";

const { questions, scales } = buildMcpi("long");

const test: PsychTest = {
  ...MCPI_BASE,
  slug: "mcpi-long",
  code: `MCPI-${questions.length}`,
  title: "پرسشنامه‌ی جامع شخصیت و سلامت روان (نسخه‌ی کامل)",
  shortDescription: `ارزیابی چندبعدی شخصیت و نشانه‌های بالینی با ${questions.length} سؤال درست/نادرست: اعتبار پاسخ، حوزه‌های کلان، مقیاس‌های بالینی، مشکلات خاص و صفات شخصیت.`,
  featured: true,
  estimatedMinutes: 30,
  version: { kind: "long", pairSlug: "mcpi-short" },
  questions,
  scales,
};

export default test;
