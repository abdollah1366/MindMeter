import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "./session";

export const ROLES = {
  PATIENT: "مراجع",
  PSYCHOLOGIST: "روانشناس",
  PHYSICIAN: "پزشک",
  ADMIN: "ادمین",
} as const;
export type Role = keyof typeof ROLES;

/** شماره‌هایی که در ADMIN_PHONES تعریف شده‌اند هنگام ورود نقش ادمین می‌گیرند */
export function isBootstrapAdmin(phone: string) {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .includes(phone);
}

export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** فقط ادمین؛ برای بقیه صفحه وجود ندارد (۴۰۴) */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}

/** متخصص تأییدشده */
export async function requireClinician(next = "/panel") {
  const user = await requireUser(next);
  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") redirect("/clinician/apply");
  return { user, profile };
}

/** آیا این متخصص اجازه‌ی دیدن پرونده‌ی این بیمار را دارد؟ */
export async function hasAccess(clinicianId: string, patientId: string) {
  const grant = await db.accessGrant.findUnique({
    where: { patientId_clinicianId: { patientId, clinicianId } },
  });
  return Boolean(grant && !grant.revokedAt);
}
