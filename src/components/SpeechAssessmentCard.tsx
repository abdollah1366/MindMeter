import Link from "next/link";
import type { SpeechAssessmentView, SpeechCategoryView } from "@/lib/speech";
import { isSpeechAssessmentAvailable, speechStatusMeta, speechTypeLabel } from "@/lib/speech";

type Props = {
  assessment: SpeechAssessmentView;
  category: SpeechCategoryView;
};

export default function SpeechAssessmentCard({ assessment, category }: Props) {
  const status = speechStatusMeta(assessment.status);
  const available = isSpeechAssessmentAvailable(assessment);

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
          <span aria-hidden>{category.icon}</span>
          {category.title}
        </span>
        <span className={`ms-auto rounded-full border px-2.5 py-1 text-xs ${status.badge}`}>
          {status.label}
        </span>
      </div>

      <p dir="ltr" className="mt-4 text-right text-xs font-medium text-slate-400">
        {assessment.titleEn}
      </p>
      <h3 className="mt-1 text-lg font-bold leading-7 text-slate-800">{assessment.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{assessment.description}</p>

      {assessment.method ? (
        <div className="mt-3 rounded-xl bg-calm-50 px-3 py-2">
          <p className="text-[11px] font-bold text-calm-700">روش ارزیابی</p>
          <p className="mt-1 text-xs leading-6 text-calm-700/80">{assessment.method}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">
          {speechTypeLabel(assessment.assessmentType)}
        </span>
        {assessment.requiresRightsReview ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
            نیازمند بررسی حقوقی
          </span>
        ) : null}
      </div>

      {assessment.requiresRightsReview && assessment.rightsNote ? (
        <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-6 text-amber-800">
          {assessment.rightsNote}
        </p>
      ) : null}

      <div className="mt-4 border-t border-slate-100 pt-3">
        {available ? (
          <span className="flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            شروع ارزیابی
          </span>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500"
          >
            <span aria-hidden>🔒</span>
            {status.action}
          </button>
        )}
      </div>
    </>
  );

  const cardClass = "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  if (available && assessment.implementationPath) {
    return (
      <Link
        href={assessment.implementationPath}
        className={`${cardClass} transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md`}
      >
        {body}
      </Link>
    );
  }

  return (
    <article className={cardClass} aria-label={`${assessment.title} — ${status.label}`}>
      {body}
    </article>
  );
}
