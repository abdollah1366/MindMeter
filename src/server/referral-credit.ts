"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { notifyLater } from "@/lib/notify";

const REFERRER_REWARD = 50_000;
const INVITEE_REWARD = 25_000;

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "MM-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function ensureReferralCode(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // collision; retry
    }
  }
  throw new Error("referral code generation failed");
}

export async function getMyReferralCode(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return ensureReferralCode(user.id);
}

export type ApplyReferralState = { error?: string; ok?: boolean };

export async function applyReferralCode(_: ApplyReferralState, form: FormData): Promise<ApplyReferralState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/referral");

  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "کد معرف را وارد کنید." };

  if (user.referredByUserId) return { error: "شما قبلاً از یک کد معرف استفاده کرده‌اید." };

  const referrer = await db.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (!referrer) return { error: "کد معرف معتبر نیست." };
  if (referrer.id === user.id) return { error: "نمی‌توانید کد خودتان را وارد کنید." };

  // اعطای اعتبار در یک تراکنش
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { referredByUserId: referrer.id } });
    await tx.user.update({ where: { id: referrer.id }, data: { creditBalance: { increment: REFERRER_REWARD } } });
    await tx.user.update({ where: { id: user.id }, data: { creditBalance: { increment: INVITEE_REWARD } } });
    await tx.creditTransaction.create({ data: { userId: referrer.id, amount: REFERRER_REWARD, kind: "REFERRAL_REWARD", sourceId: user.id, note: "هدیه معرفی دوست" } });
    await tx.creditTransaction.create({ data: { userId: user.id, amount: INVITEE_REWARD, kind: "REFERRAL_BONUS", sourceId: referrer.id, note: "هدیه ثبت‌نام با کد معرف" } });
  });

  await audit(user.id, "referral.apply", { targetType: "User", targetId: referrer.id, meta: { code } });
  notifyLater(referrer.id, { title: "هدیه معرفی دوست", body: `${REFERRER_REWARD.toLocaleString("fa-IR")} تومان اعتبار به حساب شما اضافه شد.`, url: "/profile" });

  revalidatePath("/profile");
  revalidatePath("/referral");
  return { ok: true };
}

export async function listMyReferrals() {
  const user = await getCurrentUser();
  if (!user) return [];
  const invited = await db.user.findMany({
    where: { referredByUserId: user.id },
    select: { id: true, firstName: true, lastName: true, createdAt: true, creditBalance: true },
    orderBy: { createdAt: "desc" },
  });
  return invited;
}

export async function adjustUserCredit(form: FormData) {
  const admin = await (async () => {
    const u = await getCurrentUser();
    if (!u || u.role !== "ADMIN") return null;
    return u;
  })();
  if (!admin) return;
  const userId = String(form.get("userId") ?? "");
  const amount = Number(String(form.get("amount") ?? "").replace(/[,،\s]/g, ""));
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  if (!userId || !Number.isInteger(amount) || amount === 0 || note.length < 3) return;
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { creditBalance: { increment: amount } } }),
    db.creditTransaction.create({ data: { userId, amount, kind: "ADMIN_ADJUSTMENT", note } }),
  ]);
  await audit(admin.id, "credit.adjust", { targetType: "User", targetId: userId, meta: { amount } });
  revalidatePath("/admin/credits");
}
