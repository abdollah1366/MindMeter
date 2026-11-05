import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { categories } from "@/data/categories";
import { getVisibleTests } from "@/lib/tests-service";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tests, articles, courses, clinicians] = await Promise.all([
    getVisibleTests(),
    db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.course.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.clinicianProfile.findMany({ where: { status: "APPROVED" }, select: { id: true, updatedAt: true } }),
  ]);
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"], lastModified = now) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "daily"),
    page("/tests", 0.9, "weekly"),
    page("/academy", 0.8, "weekly"),
    page("/academy/live", 0.5, "daily"),
    page("/clinicians", 0.7, "weekly"),
    page("/blog", 0.7, "weekly"),
    page("/about", 0.3, "yearly"),
    page("/certificates", 0.3, "yearly"),
    ...categories.map((c) => page(`/categories/${c.slug}`, 0.7, "weekly")),
    ...tests.map((t) => page(`/tests/${t.slug}`, 0.9, "monthly")),
    ...articles.map((a) => page(`/blog/${encodeURIComponent(a.slug)}`, 0.6, "monthly", a.updatedAt)),
    ...courses.map((c) => page(`/academy/${encodeURIComponent(c.slug)}`, 0.8, "weekly", c.updatedAt)),
    ...clinicians.map((c) => page(`/clinicians/${c.id}`, 0.5, "monthly", c.updatedAt)),
  ];
}
