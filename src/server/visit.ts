"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loadVisit } from "@/lib/visit";
import { audit } from "@/lib/audit";
import { creditVisit } from "@/lib/wallet";
import { saveUpload } from "@/lib/uploads";

/** پایان ویزیت توسط متخصص */
export async function endVisit(form: FormData) {
  const id = String(form.get("appointmentId") ?? "");
  const visit = await loadVisit(id);
  if (!visit || visit.role !== "clinician") return;
  await db.appointment.update({ where: { id }, data: { status: "COMPLETED", endedAt: new Date() } });
  await creditVisit(id);
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

/** ارسال فایل در چت ویزیت (تصویر یا PDF). فقط دو طرف همین ویزیت آن را می‌بینند. */
export async function sendVisitFile(id: string, form: FormData): Promise<{ error?: string }> {
  const visit = await loadVisit(id);
  if (!visit) return { error: "دسترسی ندارید." };
  if (!["CONFIRMED", "IN_PROGRESS"].includes(visit.appointment.status)) return { error: "این ویزیت فعال نیست." };
  const count = await db.upload.count({ where: { kind: "CHAT", scopeId: id } });
  if (count >= 20) return { error: "حداکثر ۲۰ فایل در هر جلسه." };
  const res = await saveUpload({ ownerId: visit.user.id, kind: "CHAT", scopeId: id, file: form.get("file") as File, allowPdf: true });
  if ("error" in res) return { error: res.error };
  const u = res.upload;
  await db.visitMessage.create({ data: { appointmentId: id, userId: visit.user.id, body: `[[file:${u.id}|${u.mime}|${u.name.replace(/[|\]]/g, "_")}]]` } });
  return {};
}
