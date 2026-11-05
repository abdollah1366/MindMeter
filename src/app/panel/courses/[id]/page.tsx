import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireClinician } from "@/lib/auth/guards";
import CourseManager from "@/components/academy/CourseManager";

export const metadata: Metadata = { title: "مدیریت دوره" };

type Props = { params: Promise<{ id: string }> };

export default async function PanelCourse({ params }: Props) {
  const { id } = await params;
  const { profile } = await requireClinician(`/panel/courses/${id}`);
  const course = await db.course.findUnique({ where: { id }, select: { instructorId: true } });
  if (!course || course.instructorId !== profile.id) notFound();
  return (
    <>
      <Link href="/panel/courses" className="text-sm text-slate-500 hover:text-brand-600">→ دوره‌های من</Link>
      <div className="mt-3">
        <CourseManager courseId={id} isAdmin={false} />
      </div>
    </>
  );
}
