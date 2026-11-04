import "server-only";
import { db } from "@/lib/db";

export function listPublishedArticles(take?: number) {
  return db.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    ...(take ? { take } : {}),
  });
}

export function getPublishedArticle(slug: string) {
  return db.article.findFirst({ where: { slug, status: "PUBLISHED" } });
}
