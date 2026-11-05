"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, ROLES } from "@/lib/auth/guards";
import { getTest } from "@/data/tests";

export async function setUserRole(form: FormData) {
  const admin = await requireAdmin();
  const userId = String(form.get("userId"));
  const role = String(form.get("role"));
  if (!(role in ROLES) || userId === admin.id) return; // ادمین نقش خودش را تغییر نمی‌دهد
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function reviewClinician(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const decision = String(form.get("decision"));
  const note = String(form.get("note") ?? "").trim() || null;
  if (!["APPROVED", "REJECTED", "PENDING"].includes(decision)) return;

  const profile = await db.clinicianProfile.update({ where: { id }, data: { status: decision, reviewNote: note } });
  // نقش کاربر با وضعیت تأیید هماهنگ می‌شود (ادمین‌ها نقششان حفظ می‌شود)
  const user = await db.user.findUnique({ where: { id: profile.userId } });
  if (user && user.role !== "ADMIN") {
    await db.user.update({
      where: { id: user.id },
      data: { role: decision === "APPROVED" ? profile.kind : "PATIENT" },
    });
  }
  revalidatePath("/admin/clinicians");
  revalidatePath("/clinicians");
}

export type ArticleState = { error?: string };

export async function saveArticle(_: ArticleState, form: FormData): Promise<ArticleState> {
  const admin = await requireAdmin();
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const id = str("id");
  const title = str("title");
  const slug = str("slug").toLowerCase().replace(/\s+/g, "-");
  const excerpt = str("excerpt");
  const body = str("body");
  const status = str("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const relatedTest = str("relatedTest") || null;

  if (title.length < 3) return { error: "عنوان کوتاه است." };
  if (!/^[a-z0-9؀-ۿ-]{3,120}$/.test(slug)) return { error: "نامک (slug) فقط می‌تواند حروف، عدد و خط تیره داشته باشد." };
  if (excerpt.length < 10) return { error: "خلاصه را وارد کنید." };
  if (body.length < 20) return { error: "متن مقاله کوتاه است." };
  if (relatedTest && !getTest(relatedTest)) return { error: "تست مرتبط معتبر نیست." };

  const clash = await db.article.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { error: "این نامک قبلاً استفاده شده است." };

  const existing = id ? await db.article.findUnique({ where: { id } }) : null;
  const publishedAt = status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null;
  const data = { title, slug, excerpt, body, status, relatedTest, publishedAt };

  if (existing) await db.article.update({ where: { id }, data });
  else await db.article.create({ data: { ...data, authorId: admin.id } });

  revalidatePath("/blog");
  revalidatePath("/");
  redirect("/admin/blog");
}

export async function deleteArticle(form: FormData) {
  await requireAdmin();
  await db.article.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function updateTestSetting(form: FormData) {
  await requireAdmin();
  const slug = String(form.get("slug"));
  if (!getTest(slug)) return;
  const field = String(form.get("field"));
  const value = String(form.get("value")) === "true";
  if (field !== "enabled" && field !== "featured") return;
  await db.testSetting.upsert({ where: { slug }, create: { slug, [field]: value }, update: { [field]: value } });
  revalidatePath("/admin/tests");
  revalidatePath("/", "layout");
}
