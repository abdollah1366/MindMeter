import { formatTehran } from "@/lib/tehran-time";
import { displayUser, ROLE_LABEL } from "@/lib/support";

type MessageView = {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: Date;
  user: { firstName: string | null; lastName: string | null; phone: string; role: string };
};

/** نمایش رشته پیامهای تیکت؛ نخستین پیام، متن اصلی تیکت است */
export default function TicketThread({ messages, children }: { messages: MessageView[]; children?: React.ReactNode }) {
  return (
    <div data-testid="ticket-thread" className="space-y-3">
      {messages.map((m, i) => (
        <article
          key={m.id}
          className={`rounded-2xl border p-5 ${m.isStaff ? "border-brand-200 bg-brand-50/60" : "border-slate-200 bg-white"}`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-700">{displayUser(m.user)}</span>
            <span className="rounded-full bg-white px-2 py-0.5">{ROLE_LABEL[m.user.role] ?? "کاربر"}</span>
            {m.isStaff && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-white">پاسخ پشتیبانی</span>}
            {i === 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5">پیام نخست</span>}
            <span className="ms-auto" dir="ltr">{formatTehran(m.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-7 text-slate-700">{m.body}</p>
        </article>
      ))}
      {children}
    </div>
  );
}
