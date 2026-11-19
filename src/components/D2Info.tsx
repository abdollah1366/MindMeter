import { D2_FEATURES, D2_INDEX_META, D2_TIPS } from "@/data/d2-content";

/** معرفی آزمون d2 در صفحه‌ی عمومی تست: شاخص‌ها، ویژگی‌ها و نکات اجرا */
export default function D2Info() {
  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">۱۰ شاخص آزمون d2</h2>
        <p className="mt-1 text-sm leading-7 text-slate-500">
          نتیجه‌ی این آزمون بر پایه‌ی ده شاخص استاندارد توجه انتخابی و تمرکز تفسیر می‌شود.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {D2_INDEX_META.map((item) => (
            <div key={item.code} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-800">
                <span className="me-1 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-brand-700">{item.code}</span>
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">ویژگی‌های این آزمون</h2>
          <ul className="mt-3 list-disc space-y-1.5 pe-5 text-sm leading-7 text-slate-600">
            {D2_FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">نکات مهم پیش از اجرا</h2>
          <ul className="mt-3 list-disc space-y-1.5 pe-5 text-sm leading-7 text-slate-600">
            {D2_TIPS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
