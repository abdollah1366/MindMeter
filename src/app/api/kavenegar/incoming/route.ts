import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * وبِهوک «پیامک دریافتی» کاوهنگار.
 *
 * نکته: این endpoint برای ورود با کد OTP لازم نیست؛ کاوهنگار Verify Lookup کد را ارسال میکند
 * و خود برنامه کد را تأیید میکند. این مسیر فقط زمانی کاربرد دارد که بخواهیم پیامکهای
 * ارسالشده به خط کاوهنگار را هم دریافت و لاگ کنیم.
 *
 * آدرسی که در پنل کاوهنگار وارد میشود:
 *   https://www.mindmeter.ir/api/kavenegar/incoming?secret=<KAVENEGAR_WEBHOOK_SECRET>
 * (اگر KAVENEGAR_WEBHOOK_SECRET تنظیم نشده باشد، پارامتر secret لازم نیست)
 */
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const expected = process.env.KAVENEGAR_WEBHOOK_SECRET?.trim();
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[kavenegar] KAVENEGAR_WEBHOOK_SECRET is not set — incoming webhook is unauthenticated");
    }
    return true;
  }
  const provided = req.headers.get("x-kavenegar-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readPayload(req: NextRequest): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    out[key] = value;
  });

  const raw = await req.text();
  if (!raw) return out;
  try {
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string" || typeof value === "number") out[key] = String(value);
        }
      }
    } else {
      new URLSearchParams(raw).forEach((value, key) => {
        out[key] = value;
      });
    }
  } catch {
    // کاوهنگار گاهی محتوای غیراستاندارد میفرستد؛ پیام خام را لاگ نمیکنیم.
  }
  return out;
}

function pick(payload: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (payload[key]) return payload[key];
  }
  return "";
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  const payload = await readPayload(req);
  const from = pick(payload, ["from", "sender", "mobile"]);
  const to = pick(payload, ["to", "receptor", "linenumber"]);
  const message = pick(payload, ["message", "text", "body"]);
  const messageId = pick(payload, ["messageid", "messageId", "id"]);
  const receivedAt = pick(payload, ["date", "receivedAt", "time"]);

  // محتوای پیام به دلایل حریم خصوصی لاگ نمیشود؛ فقط طول آن ثبت میگردد.
  console.info("[kavenegar] incoming", {
    from: from || "-",
    to: to || "-",
    messageId: messageId || "-",
    receivedAt: receivedAt || "-",
    length: message.length,
  });

  // همیشه 200 برمیگردانیم تا کاوهنگار تلاش مجدد نکند.
  return Response.json({ ok: true });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
