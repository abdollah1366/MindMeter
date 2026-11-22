import "server-only";
import { db } from "@/lib/db";
import { hasAccess } from "@/lib/auth/guards";
import { displayName } from "@/lib/clinicians";
import { parsePictureNamingStored } from "@/lib/speech/picture-naming-payload";
import type { PictureNamingStoredResult } from "@/lib/speech/picture-naming-types";
import { canViewGrbasResult } from "@/lib/speech/grbas-scoring";

export type PictureNamingResultView = { id: string; patientId: string; patientName: string; evaluatorName: string; createdAt: Date; result: PictureNamingStoredResult; viewer: "patient" | "clinician" };

export async function getPictureNamingResultForViewer(id: string, viewerId: string): Promise<PictureNamingResultView | null> {
  const row = await db.speechResult.findFirst({ where: { id, assessmentSlug: "picture-naming" }, select: { id: true, userId: true, createdAt: true, data: true } });
  if (!row) return null;
  let viewer: "patient" | "clinician";
  if (row.userId === viewerId) viewer = "patient";
  else {
    const profile = await db.clinicianProfile.findUnique({ where: { userId: viewerId }, select: { id: true, status: true } });
    const grant = profile && profile.status === "APPROVED" ? await hasAccess(profile.id, row.userId) : false;
    if (!canViewGrbasResult(viewerId, row.userId, grant)) return null;
    viewer = "clinician";
  }
  let result: PictureNamingStoredResult | null = null;
  try { result = parsePictureNamingStored(JSON.parse(row.data) as unknown); } catch { return null; }
  if (!result) return null;
  const [patient, evaluator] = await Promise.all([
    db.user.findUnique({ where: { id: row.userId }, select: { firstName: true, lastName: true, phone: true } }),
    db.user.findUnique({ where: { id: result.evaluator.clinicianUserId }, select: { firstName: true, lastName: true, phone: true } }),
  ]);
  return { id: row.id, patientId: row.userId, patientName: patient ? displayName(patient) : "مراجع", evaluatorName: evaluator ? displayName(evaluator) : "ارزیاب", createdAt: row.createdAt, result, viewer };
}
