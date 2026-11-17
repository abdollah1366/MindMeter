import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { formatTehran } from "@/lib/tehran-time";
import { SUPPORT_TOPIC_BY_KEY } from "@/data/support-topics";
import { priorityOf, statusOf } from "@/lib/support";

export const metadata: Metadata = { title: "تیکتهای من" };

export default async function MyTickets({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser("/tickets");
  const { status } = await searchParams;
  const filter = ["OPEN", "ANSWERED", "CLOSED"].includes(status ?? "") ? status : undefined;

  const tickets = await db.ticket.findMany({
    where: { userId: user.id, ...(filter ? { status: filter } : {}) },
    include: { _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">تیکتهای من</h1>
          <p className="mt-1 text-sm text-slate-500">پیامها و پاسخهای پشتیبانی خود را در اینجا دنبال کنید.</p>
        </div>
        <Link href="/tickets/new" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
          ثبت تیکت جدید
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/tickets" className={`rounded-xl px-3 py-1.5 ${!filter ? "bg-brand-600 text-white" : "bg-white"}`}>همه</Link>
        {Object.entries({ OPEN: "باز", ANSWERED: "پاسخ داده شده", CLOSED: "بسته شده" }).map(([k, label]) => (
          <Link key={k} href={`/tickets?status=${k}`} className={`rounded-xl px-3 py-1.5 ${filter === k ? "bg-brand-600 text-white" : "bg-white"}`}>
            {label}
          </Link>
        ))}
      </div>

      <div data-testid="ticket-list" className="space-y-3">
        {tickets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-500">تیکتی در این بخش ثبت نکردهاید.</p>
            <Link href="/support" className="mt-3 inline-block text-sm font-bold text-brand-700 hover:underline">
              مشاهده سوالات متداول ←
            </Link>
          </div>
        )}
        {tickets.map((t) => {
          const topic = SUPPORT_TOPIC_BY_KEY.get(t.topic as never);
          const st = statusOf(t.status);
          const pr = priorityOf(t.priority);
          return (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{topic?.icon ?? "🎫"} {topic?.title ?? t.topic}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">{pr.label}</span>
                  </p>
                  <h2 className="mt-2 font-extrabold text-slate-800">{t.subject}</h2>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.style}`}>{st.label}</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {t._count.messages} پیام · آخرین بهروزرسانی {formatTehran(t.updatedAt, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
