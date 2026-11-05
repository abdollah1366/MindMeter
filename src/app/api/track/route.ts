import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { TRACKED_KINDS, deviceOf, isBot, isPrivatePath, referrerHost, visitorHash } from "@/lib/analytics";

/** ثبت بازدید (بدون کوکی). همیشه 204 برمی‌گرداند تا خطا در مرورگر دیده نشود. */
export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua) || req.headers.get("dnt") === "1") return done;

  let body: { kind?: string; path?: string; referrer?: string; ref?: string; source?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return done;
  }
  const kind = TRACKED_KINDS.find((k) => k === body.kind);
  const path = typeof body.path === "string" ? body.path.split("?")[0].slice(0, 300) : "";
  if (!kind || !path.startsWith("/") || isPrivatePath(path)) return done;

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  await db.pageView.create({
    data: {
      kind,
      path,
      referrer: referrerHost(body.referrer, host),
      visitor: visitorHash(ip, ua),
      device: deviceOf(ua),
      ref: typeof body.ref === "string" ? body.ref.slice(0, 100) : null,
      source: typeof body.source === "string" && body.source ? body.source.slice(0, 60) : null,
    },
  });
  // نگه‌داری حداکثر ۴۰۰ روز
  if (Math.random() < 0.01) {
    await db.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 400 * 86400_000) } } });
  }
  return done;
}
