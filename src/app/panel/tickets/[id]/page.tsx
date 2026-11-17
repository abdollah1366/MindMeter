import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireClinician } from "@/lib/auth/guards";
import { statusOf, priorityOf } from "@/lib/support";
import { formatTehran } from "@/lib/tehran-time";
import { setTicketStatus } from "@/server/tickets";
import TicketThread from "@/components/tickets/TicketThread";
import TicketReplyForm from "@/components/tickets/TicketReplyForm";

export const metadata: Metadata = { title: "جزئیات تیکت پزشکان" };

export default async function PanelTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireClinician();

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { user: true, messages: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!ticket || ticket.topic !== "doctors") notFound();

  const st = statusOf(ticket.status);
  const pr = priorityOf(ticket.priority);

  return (
    <div className="space-y-5">
      <Link href="/panel/tickets" className="inline-block text-sm text-brand-700 hover:underline">← بازگشت به تیکتهای پزشکان</Link>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">🩺 پزشکان و متخصصان</p>
            <h1 className="mt-2 text-xl font-extrabold">{ticket.subject}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-bold ${st.style}`}>{st.label}</span>
            <span className={`rounded-full px-2.5 py-1 font-bold ${pr.style}`}>اولویت {pr.label}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          ثبت شده توسط {[ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" ") || ticket.user.phone}
          {' · '}
          {formatTehran(ticket.createdAt, { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <TicketThread messages={ticket.messages}>
        <TicketReplyForm ticketId={ticket.id} />
        <form action={setTicketStatus} className="flex justify-end">
          <input type="hidden" name="id" value={ticket.id} />
          <input type="hidden" name="next" value={ticket.status === "CLOSED" ? "OPEN" : "CLOSED"} />
          <button className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">
            {ticket.status === "CLOSED" ? "بازگشایی تیکت" : "بستن تیکت"}
          </button>
        </form>
      </TicketThread>
    </div>
  );
}
