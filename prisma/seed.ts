/**
 * داده‌ی اولیه: `npm run db:seed`
 * مقاله‌های نمونه را (اگر وجود نداشته باشند) منتشر می‌کند.
 */
import { PrismaClient } from "@prisma/client";
import { seedArticles } from "./seed-articles";
import { seedCourses } from "./seed-courses";

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

  let created = 0;
  for (const c of seedCourses) {
    if (await db.course.findUnique({ where: { slug: c.slug } })) continue;
    // کلاس زنده: چند روز بعد ساعت ۱۸:۳۰ به وقت تهران (UTC+03:30)
    const liveAt = (days: number) => {
      const d = new Date(Date.now() + days * 86400_000);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 15, 0));
    };
    await db.course.create({
      data: {
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        audience: c.audience,
        description: c.description.join("\n\n"),
        level: c.level,
        price: c.price,
        theme: c.theme,
        passingScore: c.passingScore,
        status: "PUBLISHED",
        publishedAt: new Date(),
        lessons: {
          create: c.lessons.map((l, i) => ({
            order: i + 1,
            title: l.title,
            kind: l.kind,
            durationMin: l.durationMin,
            freePreview: l.freePreview ?? false,
            liveAt: l.liveInDays ? liveAt(l.liveInDays) : null,
            body: l.body.join("\n\n"),
          })),
        },
        questions: { create: c.questions.map((q, i) => ({ order: i + 1, text: q.text, options: JSON.stringify(q.options), answer: q.answer })) },
      },
    });
    created++;
  }
  console.log(`✓ ${created} sample courses created`);
}

main().finally(() => db.$disconnect());
