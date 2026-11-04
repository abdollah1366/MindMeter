"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, isProfileComplete } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/guards";
import { toEnglishDigits } from "@/lib/validation";

export type ApplyState = { error?: string };

/** درخواست عضویت به عنوان روانشناس یا پزشک */
export async function applyAsClinician(_: ApplyState, form: FormData): Promise<ApplyState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/clinician/apply");
  if (!isProfileComplete(user)) redirect("/profile?next=/clinician/apply");

  const str = (k: string) => String(form.get(k) ?? "").trim();
  const kind = str("kind");
  const title = str("title");
  const specialty = str("specialty");
  const licenseNumber = toEnglishDigits(str("licenseNumber"));
  const bio = str("bio");
  const years = Number(toEnglishDigits(str("yearsExperience")) || NaN);

  if (!["PSYCHOLOGIST", "PHYSICIAN"].includes(kind)) return { error: "نوع فعالیت را انتخاب کنید." };
  if (title.length < 2 || specialty.length < 2) return { error: "عنوان و تخصص را وارد کنید." };
  if (!/^[A-Za-z0-9\-\/]{3,20}$/.test(licenseNumber)) return { error: "شماره‌ی نظام معتبر نیست." };
  if (bio.length > 2000) return { error: "معرفی حداکثر ۲۰۰۰ کاراکتر است." };

  const existing = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (existing?.status === "APPROVED") return { error: "حساب متخصص شما قبلاً تأیید شده است." };

  const data = {
    kind,
    title,
    specialty,
    licenseNumber,
    bio,
    city: str("city") || user.city,
    yearsExperience: Number.isFinite(years) ? years : null,
    status: "PENDING",
    reviewNote: null,
  };
  await db.clinicianProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  revalidatePath("/clinician/apply");
  redirect("/clinician/apply");
}

/** بیمار پرونده‌اش را با یک متخصص به اشتراک می‌گذارد */
export async function grantAccess(form: FormData) {
  const clinicianId = String(form.get("clinicianId") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/clinicians/${clinicianId}`);

  const clinician = await db.clinicianProfile.findUnique({ where: { id: clinicianId } });
  if (!clinician || clinician.status !== "APPROVED" || clinician.userId === user.id) return;

  await db.accessGrant.upsert({
    where: { patientId_clinicianId: { patientId: user.id, clinicianId } },
    create: { patientId: user.id, clinicianId },
    update: { revokedAt: null, createdAt: new Date() },
  });
  revalidatePath(`/clinicians/${clinicianId}`);
  revalidatePath("/my-results");
}

export async function revokeAccess(form: FormData) {
  const clinicianId = String(form.get("clinicianId") ?? "");
  const user = await getCurrentUser();
  if (!user) return;
  await db.accessGrant.updateMany({
    where: { patientId: user.id, clinicianId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath(`/clinicians/${clinicianId}`);
  revalidatePath("/my-results");
}

/** یادداشت بالینی متخصص */
export async function addClinicalNote(form: FormData) {
  const patientId = String(form.get("patientId") ?? "");
  const body = String(form.get("body") ?? "").trim();
  const user = await getCurrentUser();
  if (!user) return;
  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  if (!profile || profile.status !== "APPROVED") return;
  if (!(await hasAccess(profile.id, patientId))) return;
  if (body.length < 1 || body.length > 5000) return;

  await db.clinicalNote.create({ data: { clinicianId: profile.id, patientId, body } });
  revalidatePath(`/panel/patients/${patientId}`);
}
