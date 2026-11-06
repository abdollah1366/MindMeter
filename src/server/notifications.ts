"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { notify } from "@/lib/notify";

export async function markAllRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function setSmsReminders(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.user.update({ where: { id: user.id }, data: { smsReminders: form.get("on") === "1" } });
  revalidatePath("/notifications");
}

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function savePushSubscription(raw: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  let sub: Sub;
  try {
    sub = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  const { endpoint, keys } = sub;
  if (!endpoint || !/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !keys?.p256dh || !keys.auth) return { ok: false };
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
  });
  await notify(user.id, { title: "اعلان‌ها فعال شد", body: "یادآوری نوبت‌ها و کلاس‌های زنده روی همین دستگاه نمایش داده می‌شود.", url: "/notifications" });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}
