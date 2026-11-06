import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { sendTextSms } from "@/lib/sms";
import { absoluteUrl } from "@/lib/site";

let vapidReady: boolean | null = null;

/** کلیدهای VAPID برای Push (با `npm run vapid` ساخته می‌شوند) */
function vapid() {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  vapidReady = Boolean(pub && priv);
  if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@mindmeter.ir", pub!, priv!);
  return vapidReady;
}

export function pushEnabled() {
  return vapid();
}

type Message = { title: string; body: string; url?: string; sms?: boolean };

/**
 * اعلان به کاربر: همیشه در صندوق اعلان سایت ثبت می‌شود، به مرورگرهای مشترک Push می‌رود
 * و اگر sms=true باشد و کاربر یادآوری پیامکی را خاموش نکرده باشد، پیامک هم ارسال می‌شود.
 * خطای ارسال هرگز کار اصلی را متوقف نمی‌کند.
 */
export async function notify(userId: string, msg: Message) {
  const n = await db.notification.create({ data: { userId, title: msg.title, body: msg.body, url: msg.url ?? null } });

  if (vapid()) {
    const subs = await db.pushSubscription.findMany({ where: { userId } });
    const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url ?? "/notifications", tag: n.id });
    await Promise.all(
      subs.map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 })
          .catch(async (e: { statusCode?: number }) => {
            if (e.statusCode === 404 || e.statusCode === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          }),
      ),
    );
  }

  if (msg.sms) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { phone: true, smsReminders: true } });
    if (user?.smsReminders) {
      const link = msg.url ? `\n${absoluteUrl(msg.url)}` : "";
      await sendTextSms(user.phone, `مایندمتر: ${msg.title}\n${msg.body}${link}\nلغو یادآوری: ${absoluteUrl("/notifications")}`).catch(() => false);
    }
  }
  return n;
}

/** اعلان بدون منتظر ماندن (برای جاهایی که پاسخ کاربر نباید معطل شود) */
export function notifyLater(userId: string, msg: Message) {
  notify(userId, msg).catch((e) => console.error("notify failed", e));
}
