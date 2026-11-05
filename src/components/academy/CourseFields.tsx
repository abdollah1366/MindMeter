import { COURSE_LEVEL, COURSE_THEMES } from "@/lib/academy";

export const inputCls = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-brand-500";

type Course = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  audience: string;
  level: string;
  theme: string;
  price: number;
  status: string;
  instructorId: string | null;
  certificate: boolean;
  passingScore: number;
};

export const emptyCourse: Course = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  audience: "",
  level: "BEGINNER",
  theme: "brand",
  price: 0,
  status: "DRAFT",
  instructorId: null,
  certificate: true,
  passingScore: 70,
};

/** فیلدهای فرم دوره؛ قیمت، وضعیت و مدرس فقط برای ادمین */
export default function CourseFields({ course, isAdmin, instructors }: { course: Course; isAdmin: boolean; instructors: { id: string; label: string }[] }) {
  return (
    <>
      {course.id && <input type="hidden" name="id" value={course.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm text-slate-600">عنوان دوره</span>
          <input name="title" required defaultValue={course.title} className={inputCls} />
        </label>
        <label>
          <span className="text-sm text-slate-600">نامک (آدرس)</span>
          <input name="slug" required dir="ltr" defaultValue={course.slug} placeholder="intro-to-cbt" className={inputCls} />
        </label>
      </div>
      <label>
        <span className="text-sm text-slate-600">خلاصه (برای کارت دوره و موتورهای جستجو)</span>
        <textarea name="summary" required rows={2} defaultValue={course.summary} className={inputCls} />
      </label>
      <label>
        <span className="text-sm text-slate-600">مخاطبان دوره</span>
        <input name="audience" defaultValue={course.audience} className={inputCls} />
      </label>
      <label>
        <span className="text-sm text-slate-600">معرفی کامل دوره</span>
        <span className="block text-xs text-slate-400">پاراگراف‌ها را با یک خط خالی جدا کنید؛ «## » تیتر و «- » فهرست است.</span>
        <textarea name="description" rows={8} defaultValue={course.description} className={inputCls + " leading-8"} />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="text-sm text-slate-600">سطح</span>
          <select name="level" defaultValue={course.level} className={inputCls}>
            {Object.entries(COURSE_LEVEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm text-slate-600">رنگ جلد</span>
          <select name="theme" defaultValue={course.theme} className={inputCls}>
            {Object.entries(COURSE_THEMES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm text-slate-600">حد نصاب قبولی آزمون (٪)</span>
          <input name="passingScore" inputMode="numeric" defaultValue={course.passingScore} className={inputCls} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="certificate" defaultChecked={course.certificate} className="accent-brand-600" />
        صدور گواهی پایان دوره با کد استعلام
      </label>
      {isAdmin && (
        <div className="grid gap-4 rounded-2xl bg-surface p-4 sm:grid-cols-3">
          <label>
            <span className="text-sm text-slate-600">شهریه (تومان، ۰ = رایگان)</span>
            <input name="price" inputMode="numeric" defaultValue={course.price} className={inputCls} />
          </label>
          <label>
            <span className="text-sm text-slate-600">مدرس</span>
            <select name="instructorId" defaultValue={course.instructorId ?? ""} className={inputCls}>
              <option value="">تیم آموزشی مایندمتر</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm text-slate-600">وضعیت</span>
            <select name="status" defaultValue={course.status} className={inputCls}>
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PUBLISHED">منتشرشده</option>
            </select>
          </label>
        </div>
      )}
    </>
  );
}
