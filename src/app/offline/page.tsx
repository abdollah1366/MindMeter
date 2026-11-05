import type { Metadata } from "next";

export const metadata: Metadata = { title: "اتصال برقرار نیست", robots: { index: false } };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center">
      <p className="text-4xl">☁</p>
      <h1 className="mt-3 text-xl font-extrabold">اتصال اینترنت برقرار نیست</h1>
      <p className="mt-3 text-sm leading-7 text-slate-500">
        صفحه‌هایی که قبلاً باز کرده‌اید (مثل تست‌ها و مقالات) بدون اینترنت هم در دسترس هستند. پیشرفت تست‌های نیمه‌کاره در همین دستگاه ذخیره می‌شود و با برگشتن اینترنت می‌توانید ادامه دهید.
      </p>
      <a href="/" className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white">تلاش دوباره</a>
    </div>
  );
}
