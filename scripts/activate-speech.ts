/**
 * فعال‌سازی صریح آزمون‌های گفتار پیاده‌شده در کاتالوگ.
 * اجرا: npm run speech:activate
 *
 * این اسکریپت idempotent است و فقط آزمون‌های دارای پیاده‌سازی واقعی (MPT،
 * تحلیل واکه پایدار، ارزیابی کیفیت صوت و پرسش‌نامه VHI-30) را به وضعیت
 * اجراشده درمی‌آورد. وضعیت سایر آزمون‌ها تغییری نمی‌کند. هیچ فایل صوتی و هیچ
 * داده کاربری خوانده یا نوشته نمی‌شود.
 *
 * VHI-30 با وجود آماده بودن ساختار و محاسبه نمره، متون تأییدشده فارسی ندارد.
 * به درخواست صریح مالک محصول برای نمایش ساختار روی سایت فعال می‌شود، اما
 * گزارش آن هیچ تفسیر بالینی یا آستانه‌ای ارائه نمی‌دهد و نبود متن تأییدشده را
 * به کاربر نشان می‌دهد. پیش از استفاده بالینی باید متون معتبر وارد شوند.
 */
import { PrismaClient } from "@prisma/client";

const IMPLEMENTED = [
  { slug: "mpt", implementationKey: "mpt", implementationPath: "/speech/mpt" },
  {
    slug: "sustained-vowel-analysis",
    implementationKey: "sustained-vowel",
    implementationPath: "/speech/sustained-vowel",
  },
  {
    slug: "voice-quality-assessment",
    implementationKey: "voice-quality",
    implementationPath: "/speech/voice-quality",
  },
  {
    slug: "vhi-30",
    implementationKey: "vhi-30",
    implementationPath: "/speech/vhi-30",
  },
  {
    slug: "grbas",
    implementationKey: "grbas",
    implementationPath: "/speech/grbas",
  },
  {
    slug: "amr",
    implementationKey: "amr",
    implementationPath: "/speech/amr",
  },
  {
    slug: "smr",
    implementationKey: "smr",
    implementationPath: "/speech/smr",
  },
] as const;

async function main() {
  const db = new PrismaClient();
  try {
    for (const item of IMPLEMENTED) {
      const existing = await db.speechAssessment.findUnique({
        where: { slug: item.slug },
        select: { id: true },
      });

      if (!existing) {
        console.error(`ردیف ${item.slug} یافت نشد. ابتدا npm run db:seed را اجرا کنید.`);
        process.exitCode = 1;
        continue;
      }

      await db.speechAssessment.update({
        where: { slug: item.slug },
        data: {
          status: "AVAILABLE",
          published: true,
          implementationKey: item.implementationKey,
          implementationPath: item.implementationPath,
        },
      });

      const row = await db.speechAssessment.findUnique({
        where: { slug: item.slug },
        select: { status: true, published: true, implementationPath: true },
      });
      console.log(`✓ ${item.slug}:`, JSON.stringify(row));
    }
  } finally {
    await db.$disconnect();
  }
}

void main();
