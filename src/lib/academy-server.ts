import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import { makeCertificateCode } from "@/lib/academy";
import { notifyLater } from "@/lib/notify";
import { creditCourse } from "@/lib/wallet";

type MaybeUser = { id: string; role: string } | null;

/** نام مدرس برای نمایش */
export function instructorLabel(course: { instructor: { title: string; user: { firstName: string | null; lastName: string | null } } | null }) {
  return course.instructor ? `${course.instructor.title} ${displayName(course.instructor.user)}` : "تیم آموزشی مایندمتر";
}

/** ادمین یا مدرس همین دوره */
export async function canManageCourse(user: MaybeUser, course: { instructorId: string | null }) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (!course.instructorId) return false;
  const p = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  return Boolean(p && p.status === "APPROVED" && p.id === course.instructorId);
}

export async function activeEnrollment(userId: string | undefined, courseId: string) {
  if (!userId) return null;
  const e = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  return e?.status === "ACTIVE" ? e : null;
}

/** بررسی کد تخفیف برای یک دوره */
export async function checkCoupon(rawCode: string, courseId: string) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { coupon: null };
  const c = await db.coupon.findUnique({ where: { code } });
  if (!c || !c.active) return { error: "کد تخفیف معتبر نیست." };
  if (c.courseId && c.courseId !== courseId) return { error: "این کد برای این دوره نیست." };
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) return { error: "مهلت این کد تخفیف تمام شده است." };
  if (c.maxUses != null && c.used >= c.maxUses) return { error: "ظرفیت این کد تخفیف پر شده است." };
  return { coupon: c };
}

/** فعال‌سازی ثبت‌نام (پس از پرداخت یا برای دوره‌ی رایگان) */
export async function activateEnrollment(enrollmentId: string) {
  const e = await db.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e || e.status === "ACTIVE") return e;
  const updated = await db.enrollment.update({ where: { id: e.id }, data: { status: "ACTIVE", activatedAt: new Date() }, include: { course: { select: { title: true, slug: true } } } });
  notifyLater(e.userId, { title: "ثبت‌نام در دوره انجام شد", body: updated.course.title, url: `/academy/${updated.course.slug}/learn` });
  if (e.couponCode) await db.coupon.updateMany({ where: { code: e.couponCode }, data: { used: { increment: 1 } } });
  await creditCourse(e.id);
  return updated;
}

/** درصد پیشرفت هر ثبت‌نام */
export async function progressOf(enrollmentId: string, courseId: string) {
  const [total, done] = await Promise.all([
    db.lesson.count({ where: { courseId } }),
    db.lessonProgress.count({ where: { enrollmentId } }),
  ]);
  return { total, done: Math.min(done, total), percent: total ? Math.round((Math.min(done, total) / total) * 100) : 0 };
}

/** صدور گواهی (اگر قبلاً صادر نشده باشد) */
export async function issueCertificate(enrollmentId: string, score: number | null) {
  const e = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: true, certificate: true, course: { include: { instructor: { include: { user: true } }, lessons: { select: { durationMin: true } } } } },
  });
  if (!e) return null;
  if (!e.completedAt) await db.enrollment.update({ where: { id: e.id }, data: { completedAt: new Date() } });
  if (e.certificate || !e.course.certificate) return e.certificate;
  const minutes = e.course.lessons.reduce((s, l) => s + l.durationMin, 0);
  for (let i = 0; i < 5; i++) {
    const code = makeCertificateCode((n) => randomInt(n));
    if (await db.certificate.findUnique({ where: { code } })) continue;
    notifyLater(e.userId, { title: "گواهی پایان دوره صادر شد", body: e.course.title, url: `/certificates/${code}` });
    return db.certificate.create({
      data: {
        code,
        enrollmentId: e.id,
        userId: e.userId,
        courseId: e.courseId,
        fullName: displayName(e.user),
        nationalId: e.user.nationalId,
        courseTitle: e.course.title,
        instructorName: instructorLabel(e.course),
        hours: Math.max(1, Math.round(minutes / 60)),
        score,
      },
    });
  }
  throw new Error("could not allocate certificate code");
}

const courseCardInclude = {
  instructor: { include: { user: true } },
  lessons: { select: { durationMin: true, kind: true } },
} as const;

/** داده‌ی کارت دوره‌ها */
export async function courseCards(where: Prisma.CourseWhereInput = { status: "PUBLISHED" }) {
  const courses = await db.course.findMany({ where, include: courseCardInclude, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] });
  return courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    theme: c.theme,
    level: c.level,
    price: c.price,
    status: c.status,
    instructor: instructorLabel(c),
    lessons: c.lessons.length,
    minutes: c.lessons.reduce((s, l) => s + l.durationMin, 0),
    hasLive: c.lessons.some((l) => l.kind === "LIVE"),
  }));
}

/** کلاس‌های زنده‌ی پیش رو (از سه ساعت پیش به بعد) */
export async function upcomingLiveLessons(opts: { userId?: string; limit?: number } = {}) {
  return db.lesson.findMany({
    where: {
      kind: "LIVE",
      liveAt: { gte: new Date(Date.now() - 3 * 3600_000) },
      course: opts.userId ? { enrollments: { some: { userId: opts.userId, status: "ACTIVE" } } } : { status: "PUBLISHED" },
    },
    include: { course: { select: { slug: true, title: true, theme: true } } },
    orderBy: { liveAt: "asc" },
    take: opts.limit ?? 50,
  });
}

/**
 * داده‌ی کلاس درس برای کاربر فعلی.
 * access: enrolled (ثبت‌نام فعال)، manager (ادمین/مدرس)، none
 */
export async function loadClassroom(slug: string, user: MaybeUser) {
  const course = await db.course.findUnique({
    where: { slug: decodeURIComponent(slug) },
    include: {
      instructor: { include: { user: true } },
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!course) return null;
  const manager = await canManageCourse(user, course);
  if (course.status !== "PUBLISHED" && !manager) return null;
  const enrollment = user
    ? await db.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
        include: { progress: true, certificate: true, attempts: { orderBy: { createdAt: "desc" }, take: 5 } },
      })
    : null;
  const enrolled = enrollment?.status === "ACTIVE";
  const done = new Set(enrolled ? enrollment.progress.map((p) => p.lessonId) : []);
  const allDone = course.lessons.length > 0 && course.lessons.every((l) => done.has(l.id));
  return { course, manager, enrollment: enrolled ? enrollment : null, done, allDone };
}
