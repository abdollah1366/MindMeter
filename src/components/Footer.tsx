import Link from "next/link";
import { categories } from "@/data/categories";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-brand-600">مایندمتر</p>
          <p className="mt-3 leading-7 text-slate-500">
            تست‌های روانشناسی آنلاین به زبان فارسی، برای شناخت بهتر خود.
          </p>
        </div>
        <div>
          <p className="font-bold">دسته‌بندی‌ها</p>
          <ul className="mt-3 space-y-2 text-slate-500">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="hover:text-brand-600">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-bold">لینک‌ها</p>
          <ul className="mt-3 space-y-2 text-slate-500">
            <li><Link href="/tests" className="hover:text-brand-600">همه‌ی تست‌ها</Link></li>
            <li><Link href="/blog" className="hover:text-brand-600">مقالات</Link></li>
            <li><Link href="/about" className="hover:text-brand-600">درباره ما</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs leading-6 text-slate-400">
        <p>نتایج تست‌های این سایت جنبه‌ی آگاهی‌بخشی دارد و جایگزین تشخیص یا مشاوره‌ی متخصص نیست.</p>
        <p dir="ltr">www.MindMeter.ir</p>
      </div>
    </footer>
  );
}
