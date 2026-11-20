"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { buildGrbasStored, parseGrbasInput } from "@/lib/speech/grbas-payload";
import { GRBAS_EVALUATOR_KINDS, type GrbasEvaluatorKind } from "@/lib/speech/grbas-types";

export type SaveGrbasResponse =
  | { ok: true; id: string }
  | { ok: false; reason: "auth" | "forbidden" | "invalid" };

function toEvaluatorKind(kind: string): GrbasEvaluatorKind | null {
  return (GRBAS_EVALUATOR_KINDS as readonly string[]).includes(kind)
    ? (kind as GrbasEvaluatorKind)
    : null;
}

/**
 * ثبت ارزیابی ادراکی GRBAS توسط متخصص تأییدشده برای یک مراجع.
 *
 * امنیت:
 *  - هویت ارزیاب فقط از session سمت سرور خوانده می‌شود.
 *  - مراجع باید مجوز فعال دسترسی به این متخصص داده باشد.
 *  - داده‌ی مرورگر با whitelist سخت‌گیرانه اعتبارسنجی می‌شود.
 *  - هر ثبت یک رکورد جدید است؛ هیچ رکورد قبلی بازنویسی نمی‌شود.
 */
export async function saveGrbasAssessment(input: unknown): Promise<SaveGrbasResponse> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth" };

  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") return { ok: false, reason: "forbidden" };

  const evaluatorKind = toEvaluatorKind(profile.kind);
  if (!evaluatorKind) return { ok: false, reason: "forbidden" };

  const payload = parseGrbasInput(input);
  if (!payload) return { ok: false, reason: "invalid" };
  if (payload.patientId === user.id) return { ok: false, reason: "forbidden" };

  const assessment = await db.speechAssessment.findFirst({
    where: { slug: "grbas", published: true, status: "AVAILABLE" },
    select: { id: true },
  });
  if (!assessment) return { ok: false, reason: "invalid" };

  // رابطه‌ی متخصص و مراجع فقط از روی AccessGrant فعال بررسی می‌شود.
  if (!(await hasAccess(profile.id, payload.patientId))) {
    return { ok: false, reason: "forbidden" };
  }

  const patient = await db.user.findUnique({
    where: { id: payload.patientId },
    select: { id: true },
  });
  if (!patient) return { ok: false, reason: "invalid" };

  const stored = buildGrbasStored(
    payload,
    {
      clinicianProfileId: profile.id,
      clinicianUserId: user.id,
      kind: evaluatorKind,
    },
    new Date(),
  );

  // نتیجه در پرونده‌ی همان مراجع ذخیره می‌شود؛ ارزیاب در payload ثبت شده است.
  const row = await db.speechResult.create({
    data: {
      userId: patient.id,
      assessmentSlug: "grbas",
      data: JSON.stringify(stored),
    },
  });

  await audit(user.id, "grbas.create", {
    targetType: "SpeechResult",
    targetId: row.id,
    patientId: patient.id,
    meta: { evaluatorProfileId: profile.id, sampleSource: stored.sampleSource },
  });

  revalidatePath("/speech/results");
  revalidatePath(`/panel/patients/${patient.id}`);

  return { ok: true, id: row.id };
}
