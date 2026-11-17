"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { SUPPORT_TOPICS, type SupportTopicKey } from "@/data/support-topics";
import { canUseDoctorsTopic } from "@/lib/support";
import { notifyLater } from "@/lib/notify";
import { audit } from "@/lib/audit";

export type TicketFormState = { error?: string };
export type ReplyState = { error?: string; ok?: boolean };

const BODY_MIN = 10;
const BODY_MAX = 4000;
const SUBJECT_MAX = 150;

function isTopic(value: string): value is SupportTopicKey {
  return SUPPORT_TOPICS.some((t) => t.key === value);
}

/** آیا کاربر می تواند به عنوان پرسنل به تیکت پاسخ دهد؟ */
function staffScope(role: string, topic: string) {
  if (role === "ADMIN") return true;
  return topic === "doctors" && (role === "PSYCHOLOGIST" || role === "PHYSICIAN");
}

async function notifyStaff(topic: string, title: string, body: string, url: string) {
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const a of admins) notifyLater(a.id, { title, body, url });
}

function revalidateTicket(id: string) {
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  revalidatePath("/panel/tickets");
  revalidatePath(`/panel/tickets/${id}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
}

/** ثبت تیکت جدید توسط کاربر */
export async function createTicket(_: TicketFormState, form: FormData): Promise<TicketFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/tickets/new");

  const topic = String(form.get("topic") ?? "customers");
  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const priority = String(form.get("priority") ?? "NORMAL");

  if (!isTopic(topic)) return { error: "موضوع تیکت معتبر نیست." };
  if (topic === "doctors" && !canUseDoctorsTopic(user.role)) {
    return { error: "بخش پزشکان فقط برای متخصصان تأیید شده است. لطفاً موضوع دیگری انتخاب کنید." };
  }
  if (subject.length < 3 || subject.length > SUBJECT_MAX) {
    return { error: `عنوان تیکت باید بین ۳ تا ${SUBJECT_MAX} حرف باشد.` };
  }
  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return { error: `لطفاً توضیحات خود را با جزئیات بنویسید (بین ${BODY_MIN} تا ${BODY_MAX} حرف).` };
  }

  const ticket = await db.ticket.create({
    data: {
      topic,
      subject: subject.slice(0, SUBJECT_MAX),
      priority: ["LOW", "NORMAL", "HIGH"].includes(priority) ? priority : "NORMAL",
      userId: user.id,
      messages: {
        create: { userId: user.id, body: body.slice(0, BODY_MAX), isStaff: false },
      },
    },
  });

  await audit(user.id, "ticket.create", { targetType: "Ticket", targetId: ticket.id, meta: { topic } });
  const topicLabel = SUPPORT_TOPICS.find((t) => t.key === topic)?.title ?? topic;
  await notifyStaff(topic, `تیکت جدید: ${topicLabel}`, subject, `/admin/tickets/${ticket.id}`);

  revalidatePath("/tickets");
  revalidatePath("/admin/tickets");
  revalidatePath("/panel/tickets");
  redirect(`/tickets/${ticket.id}?created=1`);
}

/** پاسخ به تیکت؛ نویسنده یا پرسنل مجاز */
export async function replyTicket(_: ReplyState, form: FormData): Promise<ReplyState> {
  const user = await getCurrentUser();
  if (!user) return { error: "برای پاسخدهی باید وارد شوید." };

  const id = String(form.get("ticketId") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (body.length < 2 || body.length > BODY_MAX) return { error: `متن پاسخ باید بین ۲ تا ${BODY_MAX} حرف باشد.` };

  const ticket = await db.ticket.findUnique({ where: { id }, include: { user: { select: { id: true } } } });
  if (!ticket) return { error: "تیکت یافت نشد." };

  const isStaff = staffScope(user.role, ticket.topic);
  const isOwner = ticket.userId === user.id;
  if (!isStaff && !isOwner) return { error: "شما اجازه پاسخ به این تیکت را ندارید." };
  if (ticket.status === "CLOSED" && !isStaff) return { error: "این تیکت بسته شده است. ابتدا آن را باز کنید." };

  await db.$transaction([
    db.ticketMessage.create({
      data: { ticketId: id, userId: user.id, body: body.slice(0, BODY_MAX), isStaff },
    }),
    db.ticket.update({
      where: { id },
      data: { status: isStaff ? "ANSWERED" : "OPEN", closedAt: null },
    }),
  ]);

  await audit(user.id, "ticket.reply", { targetType: "Ticket", targetId: id });
  if (isStaff) {
    notifyLater(ticket.user.id, {
      title: "پاسخ جدید به تیکت شما",
      body: `تیکت «${ticket.subject}» پاسخ گرفت.`,
      url: `/tickets/${id}`,
      sms: true,
    });
  } else {
    await notifyStaff(ticket.topic, "پاسخ جدید به تیکت", `تیکت «${ticket.subject}» پاسخ گرفت.`, `/admin/tickets/${id}`);
  }

  revalidateTicket(id);
  return { ok: true };
}

/** بستن یا بازگشایی تیکت توسط صاحب تیکت یا پرسنل */
export async function setTicketStatus(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const id = String(form.get("id") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== "CLOSED" && next !== "OPEN") return;

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return;
  const isStaff = staffScope(user.role, ticket.topic);
  if (!isStaff && ticket.userId !== user.id) return;
  if (next === "CLOSED" && ticket.status === "CLOSED") return;
  if (next === "OPEN" && ticket.status !== "CLOSED") return;

  await db.ticket.update({
    where: { id },
    data: { status: next, closedAt: next === "CLOSED" ? new Date() : null },
  });
  await audit(user.id, next === "CLOSED" ? "ticket.close" : "ticket.reopen", { targetType: "Ticket", targetId: id });

  if (isStaff) {
    notifyLater(ticket.userId, {
      title: next === "CLOSED" ? "تیکت شما بسته شد" : "تیکت شما دوباره باز شد",
      body: `تیکت «${ticket.subject}» ${next === "CLOSED" ? "توسط پشتیبانی بسته شد." : "دوباره باز شد."}`,
      url: `/tickets/${id}`,
    });
  } else {
    await notifyStaff(ticket.topic, "تغییر وضعیت تیکت", `تیکت «${ticket.subject}» ${next === "CLOSED" ? "بسته شد." : "بازگشایی شد."}`, `/admin/tickets/${id}`);
  }

  revalidateTicket(id);
}

/** تغییر اولویت تیکت توسط ادمین */
export async function setTicketPriority(form: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return;

  const id = String(form.get("id") ?? "");
  const priority = String(form.get("priority") ?? "");
  if (!["LOW", "NORMAL", "HIGH"].includes(priority)) return;

  await db.ticket.update({ where: { id }, data: { priority } });
  await audit(user.id, "ticket.priority", { targetType: "Ticket", targetId: id, meta: { priority } });
  revalidateTicket(id);
}
