"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loadVisit } from "@/lib/visit";
import { audit } from "@/lib/audit";

/** پایان ویزیت توسط متخصص */
export async function endVisit(form: FormData) {
  const id = String(form.get("appointmentId") ?? "");
  const visit = await loadVisit(id);
  if (!visit || visit.role !== "clinician") return;
  await db.appointment.update({ where: { id }, data: { status: "COMPLETED", endedAt: new Date() } });
  // سیگنال‌های قدیمی دیگر لازم نیستند؛ فقط پیام پایان می‌ماند
  await db.visitSignal.deleteMany({ where: { appointmentId: id } });
  await db.visitSignal.create({ data: { appointmentId: id, fromUserId: visit.user.id, kind: "bye", payload: "{}" } });
  redirect(`/panel/patients/${visit.appointment.patientId}`);
}

/** ذخیره‌ی یادداشت جلسه در یادداشت‌های بالینی */
export async function saveVisitNote(id: string, body: string) {
  const visit = await loadVisit(id);
  if (!visit || visit.role !== "clinician") return { ok: false };
  const text = body.trim();
  if (!text || text.length > 5000) return { ok: false };
  await db.clinicalNote.create({
    data: { clinicianId: visit.appointment.clinicianId, patientId: visit.appointment.patientId, body: `[جلسه‌ی آنلاین] ${text}` },
  });
  await audit(visit.user.id, "note.add", { targetType: "Appointment", targetId: id, patientId: visit.appointment.patientId });
  return { ok: true };
}
