import type { Metadata } from "next";
import { db } from "@/lib/db";
import { displayName } from "@/lib/clinicians";
import StateForm from "@/components/academy/StateForm";
import CourseFields, { emptyCourse } from "@/components/academy/CourseFields";
import { saveCourse } from "@/server/academy-admin";

export const metadata: Metadata = { title: "دوره‌ی جدید" };

export default async function NewCourse() {
  const instructors = (await db.clinicianProfile.findMany({ where: { status: "APPROVED" }, include: { user: true } })).map((p) => ({
    id: p.id,
    label: `${p.title} ${displayName(p.user)}`,
  }));
  return (
    <>
      <h1 className="text-2xl font-extrabold">دوره‌ی جدید</h1>
      <p className="mt-1 text-sm text-slate-500">پس از ساخت دوره، درس‌ها و سؤال‌های آزمون را اضافه کنید.</p>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">
        <StateForm action={saveCourse} submit="ساخت دوره">
          <CourseFields course={emptyCourse} isAdmin instructors={instructors} />
        </StateForm>
      </div>
    </>
  );
}
