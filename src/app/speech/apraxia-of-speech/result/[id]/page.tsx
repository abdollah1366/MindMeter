import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import ApraxiaOfSpeechReport from "@/components/speech/ApraxiaOfSpeechReport";
import { getCurrentUser } from "@/lib/auth/session";
import { getAosResultForViewer } from "@/lib/apraxia-of-speech-service";

export const metadata: Metadata = { title: "گزارش ارزیابی آپراکسی گفتار", robots: { index: false } };

type Props = { params: Promise<{ id: string }> };

export default async function ApraxiaOfSpeechResultPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/speech/apraxia-of-speech/result/${encodeURIComponent(id)}`);
  const view = await getAosResultForViewer(id, user.id);
  if (!view) notFound();
  const backHref = view.viewer === "clinician" ? `/panel/patients/${view.patientId}` : "/speech/results";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-brand-600">→ بازگشت</Link>
        <PrintButton />
      </div>
      <article className="print-area rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ApraxiaOfSpeechReport result={view.result} createdAt={view.createdAt} />
      </article>
    </div>
  );
}
