import "server-only";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** بررسی دسترسی کاربر فعلی به اتاق ویزیت */
export async function loadVisit(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const a = await db.appointment.findUnique({
    where: { id },
    include: { clinician: { include: { user: true } }, patient: true },
  });
  if (!a) return null;
  const role = a.patientId === user.id ? "patient" : a.clinician.userId === user.id ? "clinician" : null;
  if (!role) return null;
  return { user, appointment: a, role } as const;
}

/** ICE serverها برای WebRTC. در ایران برای اتصال پایدار یک TURN server (مثلاً coturn) لازم است. */
export function iceServers(): RTCIceServer[] {
  try {
    const raw = process.env.ICE_SERVERS;
    if (raw) return JSON.parse(raw);
  } catch {}
  return [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
}
