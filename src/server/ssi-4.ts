"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";
import { audit } from "@/lib/audit";
import { notifyLater } from "@/lib/notify";
import { buildSsi4Stored, parseSsi4Input } from "@/lib/speech/ssi-4-payload";

export type SaveSsi4Response = { ok: true; id: string } | { ok: false; reason: "auth" | "forbidden" | "invalid" };

export async function saveSsi4Assessment(input: unknown): Promise<SaveSsi4Response> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "auth" };
  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") return { ok: false, reason: "forbidden" };
  if (profile.kind !== "PSYCHOLOGIST" && profile.kind !== "PHYSICIAN") return { ok: false, reason: "forbidden" };
  const payload = parseSsi4Input(input);
  if (!payload) return { ok: false, reason: "invalid" };
  if (payload.patientId === user.id) return { ok: false, reason: "forbidden" };
  const assessment = await db.speechAssessment.findFirst({ where: { slug: "ssi-4", published: true, status: "AVAILABLE" }, select: { id: true } });
  if (!assessment) return { ok: false, reason: "invalid" };
  if (!(await hasAccess(profile.id, payload.patientId))) return { ok: false, reason: "forbidden" };
  const patient = await db.user.findUnique({ where: { id: payload.patientId }, select: { id: true } });
  if (!patient) return { ok: false, reason: "invalid" };
  const stored = buildSsi4Stored(payload, { clinicianProfileId: profile.id, clinicianUserId: user.id, kind: profile.kind === "PHYSICIAN" ? "PHYSICIAN" : "PSYCHOLOGIST" }, new Date());
  const row = await db.speechResult.create({ data: { userId: patient.id, assessmentSlug: "ssi-4", data: JSON.stringify(stored) } });
  await audit(user.id, "ssi-4.create", { targetType: "SpeechResult", targetId: row.id, patientId: patient.id });
  notifyLater(patient.id, { title: "ارزیابی لکنت ثبت شد", body: "یک ارزیابی لکنت (SSI-4) برای شما ثبت شد.", url: `/speech/ssi-4/result/${row.id}` });
  revalidatePath("/speech/results");
  revalidatePath(`/panel/patients/${patient.id}`);
  return { ok: true, id: row.id };
}
