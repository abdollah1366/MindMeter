import Link from "next/link";

type Props = { note: { title: string; paragraphs: string[] }; resultId?: string; print?: boolean };

/** توضیح تکمیلی نتیجه (مثلاً راهنمای ارجاع برای ارزیابی کامل هوش) */
export default function ResultNote({ note, resultId, print }: Props) {
  return (
    <section className="break-inside-avoid rounded-2xl border border-calm-200 bg-calm-50 p-5">
      <h3 className="font-bold text-calm-700">{note.title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-7 text-slate-700">
        {note.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {!print && (
        <div className="no-print mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href={resultId ? `/referral/new?result=${resultId}` : "/referral/new"}
            className="rounded-xl bg-calm-600 px-5 py-2.5 text-white hover:bg-calm-700"
          >
            درخواست ارجاع برای ارزیابی کامل
          </Link>
          <Link href="/clinicians" className="rounded-xl border border-calm-200 bg-white px-5 py-2.5 text-calm-700">
            مشاهده‌ی روانشناسان
          </Link>
        </div>
      )}
    </section>
  );
}
