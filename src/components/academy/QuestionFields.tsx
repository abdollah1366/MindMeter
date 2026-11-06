import { inputCls } from "./CourseFields";

type Q = { id?: string; text: string; options: string[]; answer: number };

export default function QuestionFields({ courseId, q }: { courseId: string; q: Q }) {
  return (
    <>
      <input type="hidden" name="courseId" value={courseId} />
      {q.id && <input type="hidden" name="id" value={q.id} />}
      <label>
        <span className="text-xs text-slate-600">متن سؤال</span>
        <textarea name="text" required rows={2} defaultValue={q.text} className={inputCls} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <label key={i} className="flex items-center gap-2">
            <input type="radio" name="answer" value={i} defaultChecked={q.answer === i} required className="accent-emerald-600" title="گزینه‌ی درست" />
            <input name={`opt${i}`} defaultValue={q.options[i] ?? ""} placeholder={`گزینه‌ی ${["اول", "دوم", "سوم", "چهارم"][i]}`} className={inputCls + " mt-0"} />
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-400">دایره‌ی کنار گزینه‌ی درست را انتخاب کنید. ترتیب گزینه‌ها در آزمون تصادفی نمایش داده می‌شود.</p>
    </>
  );
}
