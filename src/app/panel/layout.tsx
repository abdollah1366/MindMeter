import Link from "next/link";
import { requireClinician } from "@/lib/auth/guards";
import { displayName } from "@/lib/clinicians";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireClinician();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-brand-50 to-calm-50 p-5">
        <div>
          <p className="text-xs text-slate-500">پنل متخصص</p>
          <p className="text-lg font-extrabold">
            {profile.title} {displayName(user)}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/panel" className="rounded-xl bg-white px-4 py-2 hover:text-brand-600">مراجعان</Link>
          <Link href="/panel/appointments" className="rounded-xl bg-white px-4 py-2 hover:text-brand-600">نوبت‌ها</Link>
          <Link href="/panel/referrals" className="rounded-xl bg-white px-4 py-2 hover:text-brand-600">ارجاع‌ها</Link>
          <Link href="/panel/schedule" className="rounded-xl bg-white px-4 py-2 hover:text-brand-600">برنامه‌ی کاری</Link>
          <Link href="/panel/courses" className="rounded-xl bg-white px-4 py-2 hover:text-brand-600">دوره‌های آموزشی</Link>
          <Link href="/panel/wallet" className="rounded-xl bg-white px-4 py-2 hover:text-brand-600">کیف پول</Link>
          <Link href={`/clinicians/${profile.id}`} className="rounded-xl bg-white px-4 py-2 hover:text-brand-600">پروفایل عمومی</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
