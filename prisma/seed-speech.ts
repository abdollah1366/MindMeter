/**
 * seed فهرست ارزیابی گفتار و زبان.
 *
 * این تابع idempotent است: دسته‌بندی‌ها و آزمون‌ها را بر اساس slug می‌سازد یا
 * به‌روزرسانی می‌کند. وضعیت (status) و انتشار (published) ردیف‌های موجود
 * عمداً بازنویسی نمی‌شوند تا فعال‌سازی آینده‌ی یک آزمون با اجرای دوباره‌ی seed
 * از بین نرود.
 */
import type { PrismaClient } from "@prisma/client";
import { speechAssessments, speechCategories } from "../src/data/speech-catalog";

export async function seedSpeech(db: PrismaClient) {
  const categoryIds = new Map<string, string>();

  for (const c of speechCategories) {
    const row = await db.speechCategory.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        titleEn: c.titleEn,
        description: c.description,
        icon: c.icon,
        color: c.color,
        order: c.order,
      },
      create: {
        slug: c.slug,
        title: c.title,
        titleEn: c.titleEn,
        description: c.description,
        icon: c.icon,
        color: c.color,
        order: c.order,
        published: true,
      },
    });
    categoryIds.set(c.slug, row.id);
  }

  let created = 0;
  for (const a of speechAssessments) {
    const categoryId = categoryIds.get(a.categorySlug);
    if (!categoryId) {
      throw new Error(`Speech category not found for assessment "${a.slug}": ${a.categorySlug}`);
    }

    const existing = await db.speechAssessment.findUnique({
      where: { slug: a.slug },
      select: { id: true },
    });

    const content = {
      title: a.title,
      titleEn: a.titleEn,
      description: a.description,
      assessmentType: a.assessmentType,
      method: a.method,
      order: a.order,
      categoryId,
      requiresRightsReview: a.requiresRightsReview,
      rightsNote: a.rightsNote ?? null,
      implementationKey: a.implementationKey ?? null,
      implementationPath: a.implementationPath ?? null,
      metadata: a.metadata ?? null,
    };

    if (existing) {
      await db.speechAssessment.update({ where: { slug: a.slug }, data: content });
    } else {
      await db.speechAssessment.create({
        data: {
          ...content,
          slug: a.slug,
          status: a.status,
          published: a.published,
        },
      });
      created++;
    }
  }

  console.log(`✓ ${speechCategories.length} speech categories seeded`);
  console.log(`✓ ${speechAssessments.length} speech assessments seeded (${created} new)`);
}
