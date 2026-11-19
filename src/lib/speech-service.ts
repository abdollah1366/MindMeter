import "server-only";
import { db } from "@/lib/db";
import type { SpeechCategoryView } from "@/lib/speech";

/**
 * فهرست عمومی و فقط‌خواندنی ماژول ارزیابی گفتار و زبان.
 * فقط دسته‌بندی‌ها و آزمون‌های منتشرشده برگردانده می‌شوند؛ هیچ عملیات نوشتنی
 * یا دسترسی به داده‌ی کاربران در این سرویس وجود ندارد.
 */
export async function getSpeechCatalog(): Promise<SpeechCategoryView[]> {
  const rows = await db.speechCategory.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      assessments: {
        where: { published: true },
        orderBy: [{ order: "asc" }, { title: "asc" }],
      },
    },
  });

  return rows.map((category) => ({
    id: category.id,
    slug: category.slug,
    title: category.title,
    titleEn: category.titleEn,
    description: category.description,
    icon: category.icon,
    color: category.color,
    order: category.order,
    assessments: category.assessments.map((assessment) => ({
      id: assessment.id,
      slug: assessment.slug,
      title: assessment.title,
      titleEn: assessment.titleEn,
      description: assessment.description,
      assessmentType: assessment.assessmentType,
      method: assessment.method,
      status: assessment.status,
      published: assessment.published,
      order: assessment.order,
      requiresRightsReview: assessment.requiresRightsReview,
      rightsNote: assessment.rightsNote,
      implementationKey: assessment.implementationKey,
      implementationPath: assessment.implementationPath,
    })),
  }));
}
