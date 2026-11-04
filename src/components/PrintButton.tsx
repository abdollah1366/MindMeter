"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-xl bg-brand-600 px-6 py-2.5 font-bold text-white hover:bg-brand-700">
      🖨 چاپ / ذخیره‌ی PDF
    </button>
  );
}
