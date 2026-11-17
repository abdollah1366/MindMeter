import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { SUPPORT_TOPICS } from "@/data/support-topics";
import { formatTehran } from "@/lib/tehran-time";
import { priorityOf, statusOf } from "@/lib/support";
import { displayUser } from "@/lib/support";

export const metadata: Metadata = { title: "تیکتهای پشتیبانی" };

export default async function AdminTickets({ searchParams }: { searchParams: Promise<{ topic?: string; status?: string }> }) {
  const { topic, status } = await searchParams;
  const topicFilter = SUPPORT_TOPICS.some((t) => t.key === topic) ? topic : undefined;
  const statusFilter = ["OPEN", "ANSWERED", "CLOSED"].includes(status ?? "") ? status : undefined;

  const tickets = await db.ticket.findMany({
    where: { ...(topicFilter ? { topic: topicFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}) },
    include: { user: true, _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">تیکتهای پشتیبانی</h1>
        <p className="mt-1 text-sm text-slate-500">تمام تیکتهای کاربران و متخصصان بر اساس موضوع قابل فیلتر و پیگیری است.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-bold text-slate-500">فیلتر موضوع</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/admin/tickets${statusFilter ? `?status=${statusFilter}` : ""}`} className={`rounded-xl px-3 py-1.5 ${!topicFilter ? "bg-brand-600 text-white" : "bg-white"}`}>همه</Link>
          {SUPPORT_TOPICS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/tickets?topic=${t.key}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className={`rounded-xl px-3 py-1.5 ${topicFilter === t.key ? "bg-brand-600 text-white" : "bg-white"}`}
            >
              {t.icon} {t.title}
            </Link>
          ))}
        </div>
        <p className="mb-2 mt-4 text-xs font-bold text-slate-500">فیلتر وضعیت</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/admin/tickets${topicFilter ? `?topic=${topicFilter}` : ""}`} className={`rounded-xl px-3 py-1.5 ${!statusFilter ? "bg-brand-600 text-white" : "bg-white"}`}>همه</Link>
          {Object.entries({ OPEN: "باز", ANSWERED: "پاسخ داده شده", CLOSED: "بسته شده" }).map(([k, label]) => (
            <Link
              key={k}
              href={`/admin/tickets?status=${k}${topicFilter ? `&topic=${topicFilter}` : ""}`}
              className={`rounded-xl px-3 py-1.5 ${statusFilter === k ? "bg-brand-600 text-white" : "bg-white"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div data-testid="admin-ticket-list" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface text-slate-500">
            <tr>
              <th className="p-3 text-start">عنوان</th>
              <th className="p-3 text-start">ثبتکننده</th>
              <th className="p-3 text-start">موضوع</th>
              <th className="p-3 text-start">وضعیت</th>
              <th className="p-3 text-start">اولویت</th>
              <th className="p-3 text-start">پیامها</th>
              <th className="p-3 text-start">آخرین بهروزرسانی</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-slate-400">تیکتی با این فیلترها یافت نشد.</td></tr>
            )}
            {tickets.map((t) => {
              const st = statusOf(t.status);
              const pr = priorityOf(t.priority);
              const topic = SUPPORT_TOPICS.find((x) => x.key === t.topic);
              return (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-surface">
                  <td className="p-3">
                    <Link href={`/admin/tickets/${t.id}`} className="font-bold text-brand-700 hover:underline">{t.subject}</Link>
                  </td>
                  <td className="p-3">{displayUser(t.user)}</td>
                  <td className="p-3 text-xs">{topic?.icon} {topic?.title ?? t.topic}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${st.style}`}>{st.label}</span></td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pr.style}`}>{pr.label}</span></td>
                  <td className="p-3">{t._count.messages}</td>
                  <td className="p-3 text-xs text-slate-500">{formatTehran(t.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
