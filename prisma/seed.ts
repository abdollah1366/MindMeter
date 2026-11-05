/**
 * داده‌ی اولیه: `npm run db:seed`
 * مقاله‌های نمونه را (اگر وجود نداشته باشند) منتشر می‌کند.
 */
import { PrismaClient } from "@prisma/client";
import { seedArticles } from "./seed-articles";

const db = new PrismaClient();

async function main() {
  for (const a of seedArticles) {
    await db.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        body: a.body.join("\n\n"),
        relatedTest: a.relatedTest,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
  }
  console.log(`✓ ${seedArticles.length} articles seeded`);
}

main().finally(() => db.$disconnect());
