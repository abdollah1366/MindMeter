/** داده‌ی ساختاریافته (schema.org) برای موتورهای جستجو */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // جلوگیری از بسته شدن تگ script با محتوای کاربر
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
