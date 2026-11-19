/**
 * فعالسازی صریح آزمون MPT در کاتالوگ گفتار.
 * اجرا: npm run speech:activate
 *
 * این اسکریپت idempotent است و فقط ردیف mpt را به وضعیت اجراشده درمیآورد.
 * وضعیت سایر آزمونها (که هنوز پیادهای نشدهاند) تغییری نمیکند.
 * هیچ فایل صوتی و هیچ داده کاربری در آن خوانده یا نوشته نمیشود.
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  try {
    const existing = await db.speechAssessment.findUnique({
      where: { slug: "mpt" },
      select: { id: true },
    });

    if (!existing) {
      console.error("ردیف mpt یافت نشد. ابتدا npm run db:seed را اجرا کنید.");
      process.exitCode = 1;
      return;
    }

    await db.speechAssessment.update({
      where: { slug: "mpt" },
      data: {
        status: "AVAILABLE",
        published: true,
        implementationKey: "mpt",
        implementationPath: "/speech/mpt",
      },
    });

    const row = await db.speechAssessment.findUnique({
      where: { slug: "mpt" },
      select: { status: true, published: true, implementationPath: true },
    });
    console.log("✓ MPT:", JSON.stringify(row));
  } finally {
    await db.$disconnect();
  }
}

void main();
