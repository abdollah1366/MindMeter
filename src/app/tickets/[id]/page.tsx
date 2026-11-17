import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { SUPPORT_TOPIC_BY_KEY } from "@/data/support-topics";
import { priorityOf, statusOf } from "@/lib/support";
import { formatTehran } from "@/lib/tehran-time";
import { setTicketStatus } from "@/server/tickets";
import TicketThread from "@/components/tickets/TicketThread";
import TicketReplyForm from "@/components/tickets/TicketReplyForm";

export const metadata: Metadata = { title: "جزئیات تیکت" };

export default async function TicketDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const { created } = await searchParams;
  const user = await requireUser(`/tickets/${id}`);

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.userId !== user.id) notFound();

  const topic = SUPPORT_TOPIC_BY_KEY.get(ticket.topic as never);
  const st = statusOf(ticket.status);
  const pr = priorityOf(ticket.priority);

  return (
    <div className="space-y-5">
      <Link href="/tickets" className="inline-block text-sm text-brand-700 hover:underline">← بازگشت به تیکتهای من</Link>

      {created && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          تیکت شما ثبت شد. پاسخ پشتیبانی را می توانید در همین صفحه و از طریق اعلانها دنبال کنید.
        </p>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{topic?.icon ?? "🎫"} {topic?.title ?? ticket.topic}</p>
            <h1 className="mt-2 text-xl font-extrabold">{ticket.subject}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-bold ${st.style}`}>{st.label}</span>
            <span className={`rounded-full px-2.5 py-1 font-bold ${pr.style}`}>اولویت {pr.label}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          ثبت شده در {formatTehran(ticket.createdAt, { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <TicketThread messages={ticket.messages}>
        {ticket.status === "CLOSED" ? (
          <form action={setTicketStatus} className="rounded-2xl border border-slate-200 bg-white p-5">
            <input type="hidden" name="id" value={ticket.id} />
            <input type="hidden" name="next" value="OPEN" />
            <button className="rounded-xl border border-brand-200 px-5 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
              بازگشایی تیکت
            </button>
          </form>
        ) : (
          <>
            <TicketReplyForm ticketId={ticket.id} />
            <form action={setTicketStatus} className="flex justify-end">
              <input type="hidden" name="id" value={ticket.id} />
              <input type="hidden" name="next" value="CLOSED" />
              <button className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">
                بستن تیکت
              </button>
            </form>
          </>
        )}
      </TicketThread>
    </div>
  );
}
