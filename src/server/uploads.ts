"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteUpload, saveUpload } from "@/lib/uploads";

export type UploadState = { error?: string; ok?: boolean };

async function myProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  return profile ? { user, profile } : null;
}

/** عکس پروفایل متخصص */
export async function uploadAvatar(_: UploadState, form: FormData): Promise<UploadState> {
  const me = await myProfile();
  if (!me) return { error: "ابتدا درخواست عضویت متخصص را ثبت کنید." };
  const res = await saveUpload({ ownerId: me.user.id, kind: "AVATAR", file: form.get("file") as File, allowPdf: false });
  if ("error" in res) return { error: res.error };
  const old = me.profile.avatarId;
  await db.clinicianProfile.update({ where: { id: me.profile.id }, data: { avatarId: res.upload.id } });
  if (old) await deleteUpload(old);
  revalidatePath("/clinician/apply");
  revalidatePath("/clinicians");
  revalidatePath(`/clinicians/${me.profile.id}`);
  return { ok: true };
}

export async function removeAvatar() {
  const me = await myProfile();
  if (!me?.profile.avatarId) return;
  await db.clinicianProfile.update({ where: { id: me.profile.id }, data: { avatarId: null } });
  await deleteUpload(me.profile.avatarId);
  revalidatePath("/clinician/apply");
  revalidatePath("/clinicians");
}

const MAX_DOCS = 10;

/** مدارک (کارت نظام، مدرک تحصیلی و…)؛ فقط برای ادمین قابل مشاهده است */
export async function uploadDocument(_: UploadState, form: FormData): Promise<UploadState> {
  const me = await myProfile();
  if (!me) return { error: "ابتدا درخواست عضویت متخصص را ثبت کنید." };
  if ((await db.upload.count({ where: { ownerId: me.user.id, kind: "DOCUMENT" } })) >= MAX_DOCS) return { error: "حداکثر ۱۰ مدرک می‌توانید بارگذاری کنید." };
  const res = await saveUpload({ ownerId: me.user.id, kind: "DOCUMENT", file: form.get("file") as File, allowPdf: true });
  if ("error" in res) return { error: res.error };
  revalidatePath("/clinician/apply");
  revalidatePath("/admin/clinicians");
  return { ok: true };
}

export async function removeDocument(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const u = await db.upload.findUnique({ where: { id: String(form.get("id") ?? "") } });
  if (!u || u.ownerId !== user.id || u.kind !== "DOCUMENT") return;
  await deleteUpload(u.id);
  revalidatePath("/clinician/apply");
}
