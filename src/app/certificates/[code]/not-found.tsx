import Link from "next/link";

export default function CertificateNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-rose-50 p-8 text-center">
      <p className="text-lg font-extrabold text-rose-700">گواهی‌ای با این کد پیدا نشد.</p>
      <p className="mt-2 text-sm text-slate-600">کد را دوباره بررسی کنید.</p>
      <Link href="/certificates" className="mt-4 inline-block rounded-xl bg-white px-5 py-2 text-sm">استعلام دوباره</Link>
    </div>
  );
}
