import "server-only";
import { db } from "@/lib/db";
import { hasAccess } from "@/lib/auth/guards";
import { displayName } from "@/lib/clinicians";
import { parseSsi4Stored } from "@/lib/speech/ssi-4-payload";
import type { Ssi4StoredResult } from "@/lib/speech/ssi-4-types";
import { canViewGrbasResult } from "@/lib/speech/grbas-scoring";

export type Ssi4ResultView = { id: string; patientId: string; patientName: string; evaluatorName: string; createdAt: Date; result: Ssi4StoredResult; viewer: "patient" | "clinician" };

export async function getSsi4ResultForViewer(id: string, viewerId: string): Promise<Ssi4ResultView | null> {
  const row = await db.speechResult.findFirst({ where: { id, assessmentSlug: "ssi-4" }, select: { id: true, userId: true, createdAt: true, data: true } });
  if (!row) return null;
  let viewer: "patient" | "clinician";
  if (row.userId === viewerId) viewer = "patient";
  else {
    const profile = await db.clinicianProfile.findUnique({ where: { userId: viewerId }, select: { id: true, status: true } });
    const grant = profile && profile.status === "APPROVED" ? await hasAccess(profile.id, row.userId) : false;
    if (!canViewGrbasResult(viewerId, row.userId, grant)) return null;
    viewer = "clinician";
  }
  let result: Ssi4StoredResult | null = null;
  try { result = parseSsi4Stored(JSON.parse(row.data) as unknown); } catch { return null; }
  if (!result) return null;
  const [patient, evaluator] = await Promise.all([
    db.user.findUnique({ where: { id: row.userId }, select: { firstName: true, lastName: true, phone: true } }),
    db.user.findUnique({ where: { id: result.evaluator.clinicianUserId }, select: { firstName: true, lastName: true, phone: true } }),
  ]);
  return { id: row.id, patientId: row.userId, patientName: patient ? displayName(patient) : "مراجع", evaluatorName: evaluator ? displayName(evaluator) : "ارزیاب", createdAt: row.createdAt, result, viewer };
}
