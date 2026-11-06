import type { Metadata } from "next";
import Link from "next/link";
import CourseManager from "@/components/academy/CourseManager";

export const metadata: Metadata = { title: "مدیریت دوره" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function AdminCourse({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  return (
    <>
      <Link href="/admin/courses" className="text-sm text-slate-500 hover:text-brand-600">→ همه‌ی دوره‌ها</Link>
      <div className="mt-3">
        <CourseManager courseId={id} isAdmin error={error} />
      </div>
    </>
  );
}
