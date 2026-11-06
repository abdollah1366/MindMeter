import "server-only";
import { db } from "@/lib/db";
import { notifyLater } from "@/lib/notify";
import { displayName } from "@/lib/clinicians";
import { formatTehran } from "@/lib/tehran-time";

/** اطلاع تأیید نوبت به بیمار و متخصص */
export async function notifyAppointmentConfirmed(id: string) {
  const a = await db.appointment.findUnique({ where: { id }, include: { patient: true, clinician: { include: { user: true } } } });
  if (!a) return;
  const when = formatTehran(a.startsAt);
  notifyLater(a.patientId, {
    title: "نوبت شما قطعی شد",
    body: `ویزیت آنلاین با ${a.clinician.title} ${displayName(a.clinician.user)} - ${when}`,
    url: "/appointments",
    sms: true,
  });
  notifyLater(a.clinician.userId, { title: "نوبت جدید", body: `${displayName(a.patient)} - ${when}`, url: "/panel/appointments", sms: true });
}

/** اطلاع لغو نوبت به طرف مقابل */
export async function notifyAppointmentCancelled(id: string, byPatient: boolean) {
  const a = await db.appointment.findUnique({ where: { id }, include: { patient: true, clinician: { include: { user: true } } } });
  if (!a) return;
  const when = formatTehran(a.startsAt);
  if (byPatient) notifyLater(a.clinician.userId, { title: "نوبت لغو شد", body: `${displayName(a.patient)} نوبت ${when} را لغو کرد.`, url: "/panel/appointments" });
  else
    notifyLater(a.patientId, {
      title: "نوبت شما لغو شد",
      body: `نوبت ${when} توسط متخصص لغو شد.${a.cancelReason ? ` دلیل: ${a.cancelReason}` : ""}`,
      url: "/appointments",
      sms: true,
    });
}
