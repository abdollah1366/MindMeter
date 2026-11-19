/**
 * فعالسازی صریح آزمونهای گفتار پیادهایشده در کاتالوگ.
 * اجرا: npm run speech:activate
 *
 * این اسکریپت idempotent است و فقط دو آزمون دارای پیادهسازی واقعی (MPT و
 * تحلیل واکه پایدار) را به وضعیت اجراشده درمیآورد. وضعیت سایر آزمونها تغییری
 * نمیکند. هیچ فایل صوتی و هیچ داده کاربری در آن خوانده یا نوشته نمیشود.
 */
import { PrismaClient } from "@prisma/client";

const IMPLEMENTED = [
  { slug: "mpt", implementationKey: "mpt", implementationPath: "/speech/mpt" },
  {
    slug: "sustained-vowel-analysis",
    implementationKey: "sustained-vowel",
    implementationPath: "/speech/sustained-vowel",
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
