import TestCard from "@/components/TestCard";
import { tests } from "@/data/tests";

export default function HomePage() {
  return (
    <>
      <section className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold leading-relaxed">خودت را بهتر بشناس</h1>
        <p className="mt-3 leading-8 text-slate-600">
          مایندمتر مجموعه‌ای از تست‌های روانشناسی کوتاه و رایگان است. یک تست را انتخاب کن و شروع کن.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {tests.map((test) => (
          <TestCard key={test.slug} test={test} />
        ))}
      </section>
    </>
  );
}
