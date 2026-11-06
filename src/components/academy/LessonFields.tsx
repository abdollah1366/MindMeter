import { LESSON_KIND } from "@/lib/academy";
import { formatTehranInput } from "@/lib/academy-time";
import { inputCls } from "./CourseFields";

type Lesson = {
  id?: string;
  title: string;
  kind: string;
  videoUrl: string | null;
  body: string;
  durationMin: number;
  freePreview: boolean;
  liveAt: Date | null;
  liveUrl: string | null;
};

export const emptyLesson: Lesson = { title: "", kind: "TEXT", videoUrl: null, body: "", durationMin: 10, freePreview: false, liveAt: null, liveUrl: null };

export default function LessonFields({ courseId, lesson }: { courseId: string; lesson: Lesson }) {
  return (
    <>
      <input type="hidden" name="courseId" value={courseId} />
      {lesson.id && <input type="hidden" name="id" value={lesson.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px]">
        <label>
          <span className="text-xs text-slate-600">عنوان درس</span>
          <input name="title" required defaultValue={lesson.title} className={inputCls} />
        </label>
        <label>
          <span className="text-xs text-slate-600">نوع</span>
          <select name="kind" defaultValue={lesson.kind} className={inputCls}>
            {Object.entries(LESSON_KIND).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs text-slate-600">مدت (دقیقه)</span>
          <input name="durationMin" inputMode="numeric" defaultValue={lesson.durationMin} className={inputCls} />
        </label>
      </div>
      <label>
        <span className="text-xs text-slate-600">لینک ویدیو (برای درس ویدیویی یا ضبط کلاس زنده)</span>
        <input name="videoUrl" dir="ltr" defaultValue={lesson.videoUrl ?? ""} placeholder="https://www.aparat.com/v/xxxx یا https://.../lesson1.mp4" className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="text-xs text-slate-600">زمان کلاس زنده (شمسی، وقت تهران)</span>
          <input name="liveAt" dir="ltr" defaultValue={formatTehranInput(lesson.liveAt)} placeholder="1405/08/20 18:30" className={inputCls} />
        </label>
        <label>
          <span className="text-xs text-slate-600">لینک ورود به کلاس زنده</span>
          <input name="liveUrl" dir="ltr" defaultValue={lesson.liveUrl ?? ""} placeholder="https://www.skyroom.online/ch/..." className={inputCls} />
        </label>
      </div>
      <label>
        <span className="text-xs text-slate-600">متن درس یا جزوه</span>
        <textarea name="body" rows={6} defaultValue={lesson.body} className={inputCls + " leading-8"} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="freePreview" defaultChecked={lesson.freePreview} className="accent-brand-600" />
        پیش‌نمایش رایگان (برای همه قابل مشاهده)
      </label>
    </>
  );
}
