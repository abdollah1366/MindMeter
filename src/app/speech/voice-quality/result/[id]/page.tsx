import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import VoiceQualityReport from "@/components/speech/VoiceQualityReport";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpeechResultForUser } from "@/lib/speech-result-service";

export const metadata: Metadata = {
  title: "گزارش ارزیابی کیفیت صوت",
  robots: { index: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function VoiceQualitySavedResultPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/speech/voice-quality/result/${encodeURIComponent(id)}`);

  // فیلتر مالکیت داخل سرویس اعمال میشود؛ نتیجه کاربر دیگری حتی با دانستن شناسه قابل خواندن نیست.
  const row = await getSpeechResultForUser(id, user.id);
  if (!row || row.kind !== "voice-quality" || row.assessmentSlug !== "voice-quality-assessment") notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/speech/results" className="text-sm text-slate-500 hover:text-brand-600">
          → بازگشت به نتایج گفتار
        </Link>
        <PrintButton />
      </div>
      <article className="print-area rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <VoiceQualityReport result={row.result} createdAt={row.createdAt} />
      </article>
    </div>
  );
}
