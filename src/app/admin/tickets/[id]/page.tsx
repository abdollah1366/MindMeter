import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SUPPORT_TOPICS } from "@/data/support-topics";
import { formatTehran } from "@/lib/tehran-time";
import { displayUser, priorityOf, statusOf, TICKET_PRIORITY } from "@/lib/support";
import { setTicketPriority, setTicketStatus } from "@/server/tickets";
import TicketThread from "@/components/tickets/TicketThread";
import TicketReplyForm from "@/components/tickets/TicketReplyForm";

export const metadata: Metadata = { title: "مدیریت تیکت" };

export default async function AdminTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  const topic = SUPPORT_TOPICS.find((t) => t.key === ticket.topic);
  const st = statusOf(ticket.status);
  const pr = priorityOf(ticket.priority);

  return (
    <div className="space-y-5">
      <Link href="/admin/tickets" className="inline-block text-sm text-brand-700 hover:underline">← بازگشت به تیکتهای پشتیبانی</Link>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">{topic?.icon} {topic?.title ?? ticket.topic}</p>
            <h1 className="mt-2 text-xl font-extrabold">{ticket.subject}</h1>
            <p className="mt-2 text-sm text-slate-600">
              ثبتکننده: <span className="font-bold">{displayUser(ticket.user)}</span>
              <span dir="ltr" className="ms-2 text-xs text-slate-400">{ticket.user.phone}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-bold ${st.style}`}>{st.label}</span>
            <span className={`rounded-full px-2.5 py-1 font-bold ${pr.style}`}>اولویت {pr.label}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          ثبت شده در {formatTehran(ticket.createdAt, { dateStyle: "medium", timeStyle: "short" })}
        </p>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
          <form action={setTicketStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={ticket.id} />
            <input type="hidden" name="next" value={ticket.status === "CLOSED" ? "OPEN" : "CLOSED"} />
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              {ticket.status === "CLOSED" ? "بازگشایی تیکت" : "بستن تیکت"}
            </button>
          </form>
          <form action={setTicketPriority} className="flex items-center gap-2">
            <input type="hidden" name="id" value={ticket.id} />
            <select name="priority" defaultValue={ticket.priority} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {Object.entries(TICKET_PRIORITY).map(([k, v]) => <option key={k} value={k}>اولویت {v.label}</option>)}
            </select>
            <button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">تغییر اولویت</button>
          </form>
        </div>
      </div>

      <TicketThread messages={ticket.messages}>
        <TicketReplyForm ticketId={ticket.id} />
      </TicketThread>
    </div>
  );
}
