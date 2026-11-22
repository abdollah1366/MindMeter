"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { notifyLater } from "@/lib/notify";
import {
  buildExpressiveLanguageStored,
  parseExpressiveLanguageInput,
} from "@/lib/speech/expressive-language-payload";

export type SaveExpressiveLanguageResponse =
  | { ok: true; id: string }
  | { ok: false; reason: "auth" | "forbidden" | "invalid" };

export async function saveExpressiveLanguageAssessment(
  input: unknown,
): Promise<SaveExpressiveLanguageResponse> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth" };

  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") return { ok: false, reason: "forbidden" };
  if (profile.kind !== "PSYCHOLOGIST" && profile.kind !== "PHYSICIAN") {
    return { ok: false, reason: "forbidden" };
  }

  const payload = parseExpressiveLanguageInput(input);
  if (!payload) return { ok: false, reason: "invalid" };
  if (payload.patientId === user.id) return { ok: false, reason: "forbidden" };

  const assessment = await db.speechAssessment.findFirst({
    where: { slug: "expressive-language", published: true, status: "AVAILABLE" },
    select: { id: true },
  });
  if (!assessment) return { ok: false, reason: "invalid" };

  if (!(await hasAccess(profile.id, payload.patientId))) {
    return { ok: false, reason: "forbidden" };
  }

  const patient = await db.user.findUnique({
    where: { id: payload.patientId },
    select: { id: true },
  });
  if (!patient) return { ok: false, reason: "invalid" };

  const stored = buildExpressiveLanguageStored(
    payload,
    {
      clinicianProfileId: profile.id,
      clinicianUserId: user.id,
      kind: profile.kind === "PHYSICIAN" ? "PHYSICIAN" : "PSYCHOLOGIST",
    },
    new Date(),
  );

  const row = await db.speechResult.create({
    data: {
      userId: patient.id,
      assessmentSlug: "expressive-language",
      data: JSON.stringify(stored),
    },
  });

  await audit(user.id, "expressive-language.create", {
    targetType: "SpeechResult",
    targetId: row.id,
    patientId: patient.id,
  });
  notifyLater(patient.id, {
    title: "ارزیابی زبان بیانی ثبت شد",
    body: "یک ارزیابی بالینی زبان بیانی برای شما ثبت شد.",
    url: `/speech/expressive-language/result/${row.id}`,
  });
  revalidatePath("/speech/results");
  revalidatePath(`/panel/patients/${patient.id}`);

  return { ok: true, id: row.id };
}
