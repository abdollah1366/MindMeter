import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import GrbasReport from "@/components/speech/GrbasReport";
import { getCurrentUser } from "@/lib/auth/session";
import { getGrbasResultForViewer } from "@/lib/grbas-service";
import { audit } from "@/lib/audit";

export const metadata: Metadata = {
  title: "گزارش ارزیابی GRBAS",
  robots: { index: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function GrbasResultPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/speech/grbas/result/${encodeURIComponent(id)}`);

  // دسترسی در سرویس بررسی می‌شود: صاحب پرونده یا متخصص دارای مجوز فعال.
  const view = await getGrbasResultForViewer(id, user.id);
  if (!view) notFound();

  if (view.viewer === "clinician") {
    await audit(user.id, "grbas.view", {
      targetType: "SpeechResult",
      targetId: view.id,
      patientId: view.patientId,
    });
  }

  const backHref = view.viewer === "clinician" ? `/panel/patients/${view.patientId}` : "/speech/results";
  const backLabel =
    view.viewer === "clinician" ? "بازگشت به پرونده‌ی مراجع" : "بازگشت به نتایج گفتار";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-brand-600">
          → {backLabel}
        </Link>
        <PrintButton />
      </div>
      <article className="print-area rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <GrbasReport
          result={view.result}
          createdAt={view.createdAt}
          patientName={view.patientName}
          evaluatorName={view.evaluatorName}
        />
      </article>
    </div>
  );
}
