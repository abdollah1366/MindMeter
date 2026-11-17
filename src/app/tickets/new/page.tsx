import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { SUPPORT_TOPICS } from "@/data/support-topics";
import { canUseDoctorsTopic } from "@/lib/support";
import TicketForm from "@/components/tickets/TicketForm";

export const metadata: Metadata = { title: "ثبت تیکت جدید" };

export default async function NewTicket({ searchParams }: { searchParams: Promise<{ topic?: string; q?: string }> }) {
  const user = await requireUser("/tickets/new");
  const { topic, q } = await searchParams;
  const allowDoctors = canUseDoctorsTopic(user.role);
  const requested = SUPPORT_TOPICS.find((t) => t.key === topic) ?? SUPPORT_TOPICS[0];
  const blocked = requested.key === "doctors" && !allowDoctors;
  const selected = blocked ? SUPPORT_TOPICS[0] : requested;
  const faq = q ? selected.frequentQuestions.find((item) => item.id === q) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold text-brand-700">پشتیبانی</p>
          <h1 className="mt-1 text-2xl font-extrabold">ثبت تیکت جدید</h1>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            موضوع خود را انتخاب کنید و توضیحات لازم را بنویسید. هرچه جزئیات بیشتر باشد، پاسخدهی سریعتر صورت میگیرد.
          </p>
        </div>

        {blocked && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-800">
            بخش «پزشکان و متخصصان» فقط برای متخصصان تأیید شده است؛ موضوع پیش فرض به «مشتریان و کاربران» تغییر یافت.
          </p>
        )}

        {faq && (
          <p className="rounded-xl bg-calm-50 p-4 text-sm leading-7 text-calm-700">
            پرسش انتخاب شده: <span className="font-bold">{faq.question}</span>
            <br />
            عنوان و متن آن در فرم قرار گرفت؛ می توانید جزئیات بیشتری اضافه کنید.
          </p>
        )}

        <TicketForm
          defaultTopic={selected.key}
          defaultSubject={faq?.question ?? ""}
          defaultBody={faq ? `${faq.question}\n\n` : ""}
          allowDoctors={allowDoctors}
        />
      </div>

      <aside className="h-fit space-y-3 rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-extrabold text-slate-700">راهنمای انتخاب موضوع</h2>
        {SUPPORT_TOPICS.map((t) => (
          <div key={t.key} className={`rounded-xl border p-3 ${selected.key === t.key ? "border-brand-300 bg-brand-50/60" : "border-slate-100"}`}>
            <p className="text-sm font-bold">{t.icon} {t.title}</p>
            <p className="mt-1 text-xs leading-6 text-slate-500">{t.hint}</p>
            {t.key === "doctors" && !allowDoctors && (
              <Link href="/clinician/apply" className="mt-2 inline-block text-xs font-bold text-brand-700 hover:underline">
                درخواست عضویت متخصصان ←
              </Link>
            )}
          </div>
        ))}
        <Link href="/support" className="mt-2 inline-block text-xs font-bold text-brand-700 hover:underline">
          مشاهده سوالات متداول ←
        </Link>
      </aside>
    </div>
  );
}
