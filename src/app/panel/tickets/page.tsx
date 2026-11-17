import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireClinician } from "@/lib/auth/guards";
import { formatTehran } from "@/lib/tehran-time";
import { statusOf } from "@/lib/support";

export const metadata: Metadata = { title: "تیکتهای پزشکان" };

export default async function PanelTickets() {
  await requireClinician();
  const tickets = await db.ticket.findMany({
    where: { topic: "doctors" },
    include: { user: true, _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">تیکتهای پزشکان و متخصصان</h1>
        <p className="mt-1 text-sm text-slate-500">پرسشهای مربوط به حساب متخصص، مدارک و پروندهها در این بخش پیگیری می شود.</p>
      </div>

      <div data-testid="panel-ticket-list" className="space-y-3">
        {tickets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            تیکتی در بخش پزشکان ثبت نشده است.
          </div>
        )}
        {tickets.map((t) => {
          const st = statusOf(t.status);
          return (
            <Link key={t.id} href={`/panel/tickets/${t.id}`} className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-slate-800">{t.subject}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {[t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || t.user.phone} · {t._count.messages} پیام
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.style}`}>{st.label}</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">آخرین بهروزرسانی {formatTehran(t.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
