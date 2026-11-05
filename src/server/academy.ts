"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { paymentProvider } from "@/lib/zarinpal";
import { discounted, liveState, normalizeCertificateCode } from "@/lib/academy";
import { activateEnrollment, activeEnrollment, canManageCourse, checkCoupon, issueCertificate } from "@/lib/academy-server";

export type EnrollState = { error?: string };

/** ثبت‌نام در دوره (رایگان یا با پرداخت) */
export async function enrollCourse(_: EnrollState, form: FormData): Promise<EnrollState> {
  const courseId = String(form.get("courseId") ?? "");
  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "دوره پیدا نشد." };
  const back = `/academy/${course.slug}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  if (course.status !== "PUBLISHED" && !(await canManageCourse(user, course))) return { error: "ثبت‌نام این دوره هنوز باز نشده است." };

  const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
  if (existing?.status === "ACTIVE") redirect(`${back}/learn`);

  const { coupon, error } = await checkCoupon(String(form.get("coupon") ?? ""), course.id);
  if (error) return { error };
  const price = coupon ? discounted(course.price, coupon.percent) : course.price;

  const data = { price, couponCode: coupon?.code ?? null, status: "PENDING_PAYMENT" };
  const enrollment = existing
    ? await db.enrollment.update({ where: { id: existing.id }, data })
    : await db.enrollment.create({ data: { ...data, userId: user.id, courseId } });

  if (price === 0) {
    await activateEnrollment(enrollment.id);
    revalidatePath("/my-courses");
    redirect(`${back}/learn`);
  }

  // پرداخت‌های نیمه‌کاره‌ی قبلی برای این ثبت‌نام بی‌اعتبار می‌شوند
  await db.payment.updateMany({ where: { enrollmentId: enrollment.id, status: "PENDING" }, data: { status: "FAILED" } });
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      enrollmentId: enrollment.id,
      amount: price,
      provider: paymentProvider(),
      description: `ثبت‌نام دوره - ${course.title}`.slice(0, 250),
    },
  });
  redirect(`/pay/${payment.id}`);
}

/** علامت‌گذاری درس به عنوان تمام‌شده و رفتن به درس بعدی */
export async function completeLesson(form: FormData) {
  const lessonId = String(form.get("lessonId") ?? "");
  const user = await getCurrentUser();
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { course: { include: { lessons: { orderBy: { order: "asc" }, select: { id: true } } } } } });
  if (!lesson) redirect("/academy");
  const base = `/academy/${lesson.course.slug}`;
  if (!user) redirect(`/login?next=${base}/lessons/${lessonId}`);
  const e = await activeEnrollment(user.id, lesson.courseId);
  if (!e) redirect(base);
  if (lesson.kind === "LIVE" && liveState(lesson.liveAt) === "upcoming") redirect(`${base}/lessons/${lessonId}`);

  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: e.id, lessonId } },
    create: { enrollmentId: e.id, lessonId },
    update: {},
  });
  revalidatePath(base, "layout");
  const ids = lesson.course.lessons.map((l) => l.id);
  const next = ids[ids.indexOf(lessonId) + 1];
  redirect(next ? `${base}/lessons/${next}` : `${base}/learn`);
}

const ATTEMPTS_PER_DAY = 3;

export type QuizState = { error?: string; score?: number; passed?: boolean; correct?: number; total?: number; code?: string };

/** آزمون پایان دوره */
export async function submitQuiz(_: QuizState, form: FormData): Promise<QuizState> {
  const courseId = String(form.get("courseId") ?? "");
  const user = await getCurrentUser();
  if (!user) return { error: "ابتدا وارد شوید." };
  if (!isProfileComplete(user)) return { error: "برای صدور گواهی، ابتدا پروفایل خود را کامل کنید." };
  const course = await db.course.findUnique({ where: { id: courseId }, include: { questions: true, lessons: { select: { id: true } } } });
  if (!course || course.questions.length === 0) return { error: "این دوره آزمون ندارد." };
  const e = await activeEnrollment(user.id, courseId);
  if (!e) return { error: "شما در این دوره ثبت‌نام نکرده‌اید." };

  const done = await db.lessonProgress.count({ where: { enrollmentId: e.id } });
  if (done < course.lessons.length) return { error: "ابتدا همه‌ی درس‌ها را به پایان برسانید." };

  const recent = await db.quizAttempt.count({ where: { enrollmentId: e.id, createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } } });
  if (recent >= ATTEMPTS_PER_DAY) return { error: `در هر ۲۴ ساعت حداکثر ${ATTEMPTS_PER_DAY.toLocaleString("fa-IR")} بار می‌توانید در آزمون شرکت کنید.` };

  const answers: Record<string, number> = {};
  for (const q of course.questions) {
    const v = form.get(`q_${q.id}`);
    if (v == null) return { error: "به همه‌ی سؤال‌ها پاسخ دهید." };
    answers[q.id] = Number(v);
  }
  const correct = course.questions.filter((q) => answers[q.id] === q.answer).length;
  const score = Math.round((correct / course.questions.length) * 100);
  const passed = score >= course.passingScore;
  await db.quizAttempt.create({ data: { enrollmentId: e.id, answers: JSON.stringify(answers), score, passed } });

  let code: string | undefined;
  if (passed) {
    const cert = await issueCertificate(e.id, score);
    code = cert?.code;
    revalidatePath("/my-courses");
  }
  return { score, passed, correct, total: course.questions.length, code };
}

/** دریافت گواهی برای دوره‌ای که آزمون ندارد */
export async function claimCertificate(form: FormData) {
  const courseId = String(form.get("courseId") ?? "");
  const user = await getCurrentUser();
  const course = await db.course.findUnique({ where: { id: courseId }, include: { _count: { select: { lessons: true, questions: true } } } });
  if (!course) redirect("/academy");
  const back = `/academy/${course.slug}/learn`;
  if (!user) redirect(`/login?next=${back}`);
  if (!isProfileComplete(user)) redirect(`/profile?next=${back}`);
  const e = await activeEnrollment(user.id, courseId);
  if (!e || course._count.questions > 0) redirect(back);
  const done = await db.lessonProgress.count({ where: { enrollmentId: e.id } });
  if (done < course._count.lessons) redirect(back);
  const cert = await issueCertificate(e.id, null);
  revalidatePath("/my-courses");
  redirect(cert ? `/certificates/${cert.code}` : back);
}

/** استعلام گواهی */
export async function lookupCertificate(form: FormData) {
  const code = normalizeCertificateCode(String(form.get("code") ?? ""));
  redirect(code ? `/certificates/${code}` : "/certificates?invalid=1");
}
