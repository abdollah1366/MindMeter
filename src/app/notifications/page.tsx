import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { formatTehran } from "@/lib/tehran-time";
import PushToggle from "@/components/PushToggle";
import { markAllRead, setSmsReminders } from "@/server/notifications";

export const metadata: Metadata = { title: "اعلان‌ها", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const [items, me] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.user.findUnique({ where: { id: user.id }, select: { smsReminders: true } }),
  ]);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">اعلان‌ها</h1>
        {unread > 0 && (
          <form action={markAllRead}>
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:text-brand-600">همه خوانده شد</button>
          </form>
        )}
      </div>

      <div className="mt-5 grid gap-3">
        <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <div>
            <p className="font-bold">یادآوری پیامکی</p>
            <p className="mt-1 text-xs text-slate-500">۲۴ ساعت و ۱ ساعت پیش از ویزیت آنلاین و کلاس زنده پیامک می‌گیرید.</p>
          </div>
          <form action={setSmsReminders}>
            <input type="hidden" name="on" value={me?.smsReminders ? "0" : "1"} />
            <button className={`rounded-xl px-4 py-2 text-xs font-bold ${me?.smsReminders ? "bg-slate-100 text-slate-600" : "bg-brand-600 text-white"}`}>
              {me?.smsReminders ? "خاموش کردن پیامک" : "روشن کردن پیامک"}
            </button>
          </form>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-center text-slate-500">اعلانی ندارید.</p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {items.map((n) => {
            const inner = (
              <>
                <p className={`text-sm ${n.readAt ? "" : "font-bold"}`}>
                  {!n.readAt && <span className="me-1.5 inline-block h-2 w-2 rounded-full bg-warm-500" />}
                  {n.title}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">{n.body}</p>
                <p className="mt-1 text-[11px] text-slate-400">{formatTehran(n.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
              </>
            );
            return (
              <li key={n.id} className={n.readAt ? "" : "bg-warm-100/30"}>
                {n.url ? (
                  <Link href={n.url} className="block p-4 hover:bg-slate-50">{inner}</Link>
                ) : (
                  <div className="p-4">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
