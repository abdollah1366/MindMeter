import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";

const nav = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/analytics", label: "آمار بازدید" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/clinicians", label: "متخصصان" },
  { href: "/admin/appointments", label: "نوبت‌ها و پرداخت‌ها" },
  { href: "/admin/referrals", label: "ارجاع‌ها" },
  { href: "/admin/blog", label: "وبلاگ" },
  { href: "/admin/tests", label: "تست‌ها" },
  { href: "/admin/norms", label: "هنجارها" },
  { href: "/admin/courses", label: "آکادمی" },
  { href: "/admin/coupons", label: "کدهای تخفیف" },
];

export const metadata = { robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-24">
        <p className="px-3 pt-1 pb-2 text-xs font-bold text-calm-600">پنل مدیریت</p>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-xl px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand-700">
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
