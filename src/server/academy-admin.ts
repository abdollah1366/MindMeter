"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/guards";
import { canManageCourse } from "@/lib/academy-server";
import { COURSE_LEVEL, COURSE_THEMES, LESSON_KIND, isValidVideoUrl } from "@/lib/academy";
import { parseTehranDateTime } from "@/lib/academy-time";
import { normalizeIranMobile, toEnglishDigits } from "@/lib/validation";

export type FormState = { error?: string; ok?: boolean };

const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const num = (form: FormData, k: string) => Number(toEnglishDigits(str(form, k)).replace(/[,،\s]/g, "") || "0");

/** مسیر پنل مدیریت دوره بسته به نقش */
function manageBase(role: string) {
  return role === "ADMIN" ? "/admin/courses" : "/panel/courses";
}

async function managerOf(courseId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course || !(await canManageCourse(user, course))) return null;
  return { user, course };
}

function refresh(slug: string, id: string) {
  revalidatePath("/academy");
  revalidatePath(`/academy/${slug}`, "layout");
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath(`/panel/courses/${id}`);
}

/** ساخت یا ویرایش دوره. قیمت، وضعیت انتشار و مدرس فقط توسط ادمین تغییر می‌کند. */
export async function saveCourse(_: FormState, form: FormData): Promise<FormState> {
  const id = str(form, "id");
  const user = await getCurrentUser();
  if (!user) return { error: "ابتدا وارد شوید." };
  const isAdmin = user.role === "ADMIN";
  const existing = id ? await db.course.findUnique({ where: { id } }) : null;
  if (id && (!existing || !(await canManageCourse(user, existing)))) return { error: "دسترسی ندارید." };
  if (!id && !isAdmin) return { error: "فقط ادمین می‌تواند دوره‌ی جدید بسازد." };

  const title = str(form, "title");
  const slug = str(form, "slug").toLowerCase().replace(/\s+/g, "-");
  const summary = str(form, "summary");
  const level = str(form, "level");
  const theme = str(form, "theme");
  const passingScore = num(form, "passingScore");
  if (title.length < 3) return { error: "عنوان کوتاه است." };
  if (!/^[a-z0-9؀-ۿ-]{3,120}$/.test(slug)) return { error: "نامک فقط می‌تواند حروف، عدد و خط تیره داشته باشد." };
  if (summary.length < 10) return { error: "خلاصه‌ی دوره را بنویسید." };
  if (!COURSE_LEVEL[level]) return { error: "سطح دوره معتبر نیست." };
  if (!COURSE_THEMES[theme]) return { error: "رنگ جلد معتبر نیست." };
  if (!Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100) return { error: "حد نصاب قبولی باید بین ۰ تا ۱۰۰ باشد." };
  if (await db.course.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) return { error: "این نامک قبلاً استفاده شده است." };

  const data: Record<string, unknown> = {
    title,
    slug,
    summary,
    description: str(form, "description"),
    audience: str(form, "audience"),
    level,
    theme,
    passingScore,
    certificate: form.get("certificate") === "on",
  };

  if (isAdmin) {
    const price = num(form, "price");
    if (!Number.isInteger(price) || price < 0 || price > 500_000_000) return { error: "قیمت معتبر نیست." };
    const status = str(form, "status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const instructorId = str(form, "instructorId") || null;
    if (instructorId) {
      const p = await db.clinicianProfile.findUnique({ where: { id: instructorId } });
      if (!p || p.status !== "APPROVED") return { error: "مدرس انتخاب‌شده متخصص تأییدشده نیست." };
    }
    Object.assign(data, { price, status, instructorId, publishedAt: status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null });
  }

  const saved = existing
    ? await db.course.update({ where: { id }, data })
    : await db.course.create({ data: data as Parameters<typeof db.course.create>[0]["data"] });
  refresh(saved.slug, saved.id);
  if (!existing) redirect(`/admin/courses/${saved.id}`);
  return { ok: true };
}

export async function deleteCourse(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const paid = await db.enrollment.count({ where: { courseId: id, status: "ACTIVE" } });
  if (paid > 0) redirect(`/admin/courses/${id}?error=has-students`);
  await db.course.delete({ where: { id } });
  revalidatePath("/academy");
  redirect("/admin/courses");
}

/** ساخت یا ویرایش درس */
export async function saveLesson(_: FormState, form: FormData): Promise<FormState> {
  const m = await managerOf(str(form, "courseId"));
  if (!m) return { error: "دسترسی ندارید." };
  const id = str(form, "id");
  const title = str(form, "title");
  const kind = str(form, "kind");
  const videoUrl = str(form, "videoUrl") || null;
  const liveUrl = str(form, "liveUrl") || null;
  const liveRaw = str(form, "liveAt");
  const durationMin = num(form, "durationMin");
  if (title.length < 2) return { error: "عنوان درس را بنویسید." };
  if (!LESSON_KIND[kind]) return { error: "نوع درس معتبر نیست." };
  if (!Number.isInteger(durationMin) || durationMin < 0 || durationMin > 1000) return { error: "مدت درس معتبر نیست." };
  if (kind === "VIDEO" && !videoUrl) return { error: "برای درس ویدیویی لینک ویدیو لازم است." };
  if (videoUrl && !isValidVideoUrl(videoUrl)) return { error: "لینک ویدیو پشتیبانی نمی‌شود. لینک https فایل mp4/m3u8 یا صفحه‌ی آپارات/یوتیوب وارد کنید." };
  if (liveUrl && !/^https:\/\/\S+$/.test(liveUrl)) return { error: "لینک کلاس زنده باید با https شروع شود." };
  const liveAt = liveRaw ? parseTehranDateTime(liveRaw) : null;
  if (liveRaw && !liveAt) return { error: "زمان کلاس را به شکل ۱۴۰۵/۰۸/۲۰ ۱۸:۳۰ وارد کنید." };
  if (kind === "LIVE" && !liveAt) return { error: "برای کلاس زنده زمان شروع لازم است." };

  const data = { title, kind, videoUrl, liveUrl, liveAt, durationMin, body: str(form, "body"), freePreview: form.get("freePreview") === "on" };
  if (id) {
    const l = await db.lesson.findUnique({ where: { id } });
    if (!l || l.courseId !== m.course.id) return { error: "درس پیدا نشد." };
    await db.lesson.update({ where: { id }, data });
  } else {
    const last = await db.lesson.findFirst({ where: { courseId: m.course.id }, orderBy: { order: "desc" } });
    await db.lesson.create({ data: { ...data, courseId: m.course.id, order: (last?.order ?? 0) + 1 } });
  }
  refresh(m.course.slug, m.course.id);
  if (!id) redirect(`${manageBase(m.user.role)}/${m.course.id}#lessons`);
  return { ok: true };
}

export async function deleteLesson(form: FormData) {
  const m = await managerOf(str(form, "courseId"));
  if (!m) return;
  await db.lesson.deleteMany({ where: { id: str(form, "id"), courseId: m.course.id } });
  refresh(m.course.slug, m.course.id);
}

/** جابه‌جایی ترتیب درس */
export async function moveLesson(form: FormData) {
  const m = await managerOf(str(form, "courseId"));
  if (!m) return;
  const lessons = await db.lesson.findMany({ where: { courseId: m.course.id }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  const i = lessons.findIndex((l) => l.id === str(form, "id"));
  const j = i + (str(form, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= lessons.length) return;
  [lessons[i], lessons[j]] = [lessons[j], lessons[i]];
  await db.$transaction(lessons.map((l, k) => db.lesson.update({ where: { id: l.id }, data: { order: k + 1 } })));
  refresh(m.course.slug, m.course.id);
}

/** سؤال آزمون پایانی */
export async function saveQuestion(_: FormState, form: FormData): Promise<FormState> {
  const m = await managerOf(str(form, "courseId"));
  if (!m) return { error: "دسترسی ندارید." };
  const id = str(form, "id");
  const text = str(form, "text");
  const options = [0, 1, 2, 3].map((i) => str(form, `opt${i}`)).filter(Boolean);
  const answer = num(form, "answer");
  if (text.length < 5) return { error: "متن سؤال را بنویسید." };
  if (options.length < 2) return { error: "حداقل دو گزینه لازم است." };
  if (new Set(options).size !== options.length) return { error: "گزینه‌ها نباید تکراری باشند." };
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return { error: "گزینه‌ی درست را از میان گزینه‌های پرشده انتخاب کنید." };
  const data = { text, options: JSON.stringify(options), answer };
  if (id) {
    await db.courseQuestion.updateMany({ where: { id, courseId: m.course.id }, data });
  } else {
    const last = await db.courseQuestion.findFirst({ where: { courseId: m.course.id }, orderBy: { order: "desc" } });
    await db.courseQuestion.create({ data: { ...data, courseId: m.course.id, order: (last?.order ?? 0) + 1 } });
  }
  refresh(m.course.slug, m.course.id);
  if (!id) redirect(`${manageBase(m.user.role)}/${m.course.id}#quiz`);
  return { ok: true };
}

export async function deleteQuestion(form: FormData) {
  const m = await managerOf(str(form, "courseId"));
  if (!m) return;
  await db.courseQuestion.deleteMany({ where: { id: str(form, "id"), courseId: m.course.id } });
  refresh(m.course.slug, m.course.id);
}

/** ثبت‌نام دستی یک کاربر (مثلاً پرداخت حضوری) توسط ادمین */
export async function enrollManually(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const courseId = str(form, "courseId");
  const phone = normalizeIranMobile(str(form, "phone"));
  if (!phone) return { error: "شماره موبایل معتبر نیست." };
  const user = await db.user.findUnique({ where: { phone } });
  if (!user) return { error: "کاربری با این شماره ثبت‌نام نکرده است." };
  await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId, status: "ACTIVE", activatedAt: new Date() },
    update: { status: "ACTIVE", activatedAt: new Date() },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

/** کد تخفیف */
export async function saveCoupon(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const code = str(form, "code").toUpperCase();
  const percent = num(form, "percent");
  const maxUsesRaw = str(form, "maxUses");
  const maxUses = maxUsesRaw ? num(form, "maxUses") : null;
  const courseId = str(form, "courseId") || null;
  const expiresRaw = str(form, "expiresAt");
  const expiresAt = expiresRaw ? parseTehranDateTime(expiresRaw.includes(" ") ? expiresRaw : `${expiresRaw} 23:59`) : null;
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "کد باید ۳ تا ۳۰ حرف انگلیسی یا عدد باشد." };
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) return { error: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد." };
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) return { error: "سقف استفاده معتبر نیست." };
  if (expiresRaw && !expiresAt) return { error: "تاریخ انقضا را به شکل ۱۴۰۵/۰۹/۳۰ وارد کنید." };
  if (courseId && !(await db.course.findUnique({ where: { id: courseId } }))) return { error: "دوره پیدا نشد." };
  if (await db.coupon.findUnique({ where: { code } })) return { error: "این کد قبلاً ساخته شده است." };
  await db.coupon.create({ data: { code, percent, maxUses, courseId, expiresAt } });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function toggleCoupon(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const c = await db.coupon.findUnique({ where: { id } });
  if (c) await db.coupon.update({ where: { id }, data: { active: !c.active } });
  revalidatePath("/admin/coupons");
}

/** ابطال یا بازگرداندن گواهی */
export async function toggleCertificate(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const c = await db.certificate.findUnique({ where: { id } });
  if (!c) return;
  await db.certificate.update({ where: { id }, data: { revokedAt: c.revokedAt ? null : new Date() } });
  revalidatePath(`/certificates/${c.code}`);
  revalidatePath(`/admin/courses/${c.courseId}`);
}
