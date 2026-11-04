import type { Metadata } from "next";
import MyResults from "@/components/MyResults";

export const metadata: Metadata = { title: "نتایج من" };

export default function MyResultsPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">نتایج من</h1>
      <p className="mt-2 mb-6 text-sm text-slate-500">
        نتایج فقط در همین مرورگر ذخیره می‌شوند. با اضافه شدن حساب کاربری، در همه‌ی دستگاه‌ها در دسترس خواهند بود.
      </p>
      <MyResults />
    </>
  );
}
