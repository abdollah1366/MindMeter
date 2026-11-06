"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/guards";
import { MIN_PAYOUT, balanceOf, normalizeIban, setCommissionPercent } from "@/lib/wallet";
import { notifyLater } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { toEnglishDigits } from "@/lib/validation";
import { formatToman } from "@/lib/tehran-time";

export type WalletState = { error?: string; ok?: boolean };

async function approvedProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const p = await db.clinicianProfile.findUnique({ where: { userId: user.id } });
  return p && p.status === "APPROVED" ? { user, profile: p } : null;
}

const amountOf = (v: FormDataEntryValue | null) => Number(toEnglishDigits(String(v ?? "")).replace(/[,،\s]/g, "") || "0");

export async function saveIban(_: WalletState, form: FormData): Promise<WalletState> {
  const me = await approvedProfile();
  if (!me) return { error: "دسترسی ندارید." };
  const iban = normalizeIban(String(form.get("iban") ?? ""));
  const owner = String(form.get("ibanOwner") ?? "").trim().slice(0, 100);
  if (!iban) return { error: "شماره‌ی شبا معتبر نیست. ۲۴ رقم بعد از IR را درست وارد کنید." };
  if (owner.length < 3) return { error: "نام صاحب حساب را بنویسید." };
  await db.clinicianProfile.update({ where: { id: me.profile.id }, data: { iban, ibanOwner: owner } });
  revalidatePath("/panel/wallet");
  return { ok: true };
}

export async function requestPayout(_: WalletState, form: FormData): Promise<WalletState> {
  const me = await approvedProfile();
  if (!me) return { error: "دسترسی ندارید." };
  if (!me.profile.iban || !me.profile.ibanOwner) return { error: "ابتدا شماره‌ی شبا را ثبت کنید." };
  if (await db.payout.findFirst({ where: { clinicianId: me.profile.id, status: "REQUESTED" } })) return { error: "یک درخواست تسویه‌ی در حال بررسی دارید." };
  const balance = await balanceOf(me.profile.id);
  const amount = amountOf(form.get("amount")) || balance;
  if (!Number.isInteger(amount) || amount < MIN_PAYOUT) return { error: `حداقل مبلغ تسویه ${formatToman(MIN_PAYOUT)} است.` };
  if (amount > balance) return { error: "مبلغ از موجودی بیشتر است." };

  // بررسی دوباره داخل تراکنش تا دو درخواست هم‌زمان بیش از موجودی برداشت نکنند
  const ok = await db.$transaction(async (tx) => {
    if (await tx.payout.findFirst({ where: { clinicianId: me.profile.id, status: "REQUESTED" } })) return false;
    const sum = (await tx.ledgerEntry.aggregate({ where: { clinicianId: me.profile.id }, _sum: { amount: true } }))._sum.amount ?? 0;
    if (amount > sum) return false;
    const p = await tx.payout.create({ data: { clinicianId: me.profile.id, amount, iban: me.profile.iban!, ibanOwner: me.profile.ibanOwner! } });
    await tx.ledgerEntry.create({ data: { clinicianId: me.profile.id, kind: "PAYOUT", amount: -amount, sourceId: p.id, note: "درخواست تسویه" } });
    return true;
  });
  if (!ok) return { error: "درخواست ثبت نشد؛ موجودی یا درخواست‌های قبلی را بررسی کنید." };
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const a of admins) notifyLater(a.id, { title: "درخواست تسویه‌ی جدید", body: `${me.profile.title} - ${formatToman(amount)}`, url: "/admin/payouts" });
  revalidatePath("/panel/wallet");
  return { ok: true };
}

/** پرداخت یا رد درخواست تسویه توسط ادمین */
export async function decidePayout(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  const reference = String(form.get("reference") ?? "").trim().slice(0, 60) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  const p = await db.payout.findUnique({ where: { id }, include: { clinician: true } });
  if (!p || p.status !== "REQUESTED") return;
  if (decision === "PAID") {
    if (!reference) return;
    await db.payout.update({ where: { id }, data: { status: "PAID", reference, note, decidedAt: new Date() } });
    notifyLater(p.clinician.userId, { title: "تسویه انجام شد", body: `${formatToman(p.amount)} به حساب شما واریز شد. شماره‌ی پیگیری: ${reference}`, url: "/panel/wallet", sms: true });
  } else if (decision === "REJECTED") {
    await db.$transaction([
      db.payout.update({ where: { id }, data: { status: "REJECTED", note, decidedAt: new Date() } }),
      db.ledgerEntry.create({ data: { clinicianId: p.clinicianId, kind: "PAYOUT_REVERSAL", amount: p.amount, sourceId: p.id, note: note ?? "رد درخواست تسویه" } }),
    ]);
    notifyLater(p.clinician.userId, { title: "درخواست تسویه تأیید نشد", body: note ?? "مبلغ به موجودی شما برگشت.", url: "/panel/wallet" });
  } else return;
  await audit(admin.id, "payout.decide", { targetType: "Payout", targetId: id, meta: { decision, amount: p.amount } });
  revalidatePath("/admin/payouts");
}

export async function saveCommission(_: WalletState, form: FormData): Promise<WalletState> {
  const admin = await requireAdmin();
  const v = amountOf(form.get("percent"));
  if (!Number.isFinite(v) || v < 0 || v > 100) return { error: "درصد باید بین ۰ تا ۱۰۰ باشد." };
  await setCommissionPercent(v);
  await audit(admin.id, "commission.change", { meta: { percent: v } });
  revalidatePath("/admin/payouts");
  return { ok: true };
}

/** اصلاح دستی موجودی (مثلاً جبران یا کسر بابت بازپرداخت به مراجع) */
export async function adjustBalance(_: WalletState, form: FormData): Promise<WalletState> {
  const admin = await requireAdmin();
  const clinicianId = String(form.get("clinicianId") ?? "");
  const raw = toEnglishDigits(String(form.get("amount") ?? "")).replace(/[,،\s]/g, "");
  const amount = Number(raw);
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  if (!Number.isInteger(amount) || amount === 0) return { error: "مبلغ را (مثبت یا منفی) وارد کنید." };
  if (note.length < 3) return { error: "دلیل اصلاح را بنویسید." };
  if (!(await db.clinicianProfile.findUnique({ where: { id: clinicianId } }))) return { error: "متخصص پیدا نشد." };
  await db.ledgerEntry.create({ data: { clinicianId, kind: "ADJUSTMENT", amount, note } });
  await audit(admin.id, "wallet.adjust", { targetType: "ClinicianProfile", targetId: clinicianId, meta: { amount } });
  revalidatePath("/admin/payouts");
  return { ok: true };
}
