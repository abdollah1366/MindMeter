import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLES } from "@/lib/auth/guards";
import { displayName } from "@/lib/clinicians";
import { formatJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/scoring";
import { toEnglishDigits } from "@/lib/validation";
import { setUserRole } from "@/server/admin";

export const metadata: Metadata = { title: "کاربران" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const { q = "", role = "" } = await searchParams;
  const me = await getCurrentUser();
  const term = toEnglishDigits(q.trim());
  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(term
        ? { OR: [{ phone: { contains: term } }, { firstName: { contains: term } }, { lastName: { contains: term } }, { nationalId: { contains: term } }] }
        : {}),
    },
    include: { _count: { select: { results: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <h1 className="text-2xl font-extrabold">کاربران</h1>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="موبایل، نام یا کد ملی" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
        <select name="role" defaultValue={role} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">همه‌ی نقش‌ها</option>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button className="rounded-xl bg-brand-600 px-4 text-sm text-white">فیلتر</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-slate-500">
            <tr>
              <th className="p-3 text-start">نام</th>
              <th className="p-3 text-start">موبایل</th>
              <th className="p-3 text-start">تست‌ها</th>
              <th className="p-3 text-start">عضویت</th>
              <th className="p-3 text-start">نقش</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3">{displayName({ ...u, phone: undefined })}</td>
                <td className="p-3" dir="ltr">{toPersianDigits(u.phone)}</td>
                <td className="p-3">{toPersianDigits(u._count.results)}</td>
                <td className="p-3 text-slate-500">{formatJalali(u.createdAt)}</td>
                <td className="p-3">
                  {u.id === me?.id ? (
                    <span className="text-slate-500">{ROLES[u.role as keyof typeof ROLES]} (شما)</span>
                  ) : (
                    <form action={setUserRole} className="flex gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.role} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                        {Object.entries(ROLES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <button className="rounded-lg bg-slate-100 px-2 text-xs hover:bg-brand-100">ثبت</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-6 text-center text-sm text-slate-500">کاربری پیدا نشد.</p>}
      </div>
    </>
  );
}
