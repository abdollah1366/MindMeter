import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { canJoin } from "@/lib/scheduling";
import { loadVisit } from "@/lib/visit";

/**
 * سیگنالینگ و چت ویزیت آنلاین (polling).
 * GET ?since=<ISO>&msgSince=<ISO>  →  سیگنال‌ها و پیام‌های چت از آن زمان به بعد (کلاینت با id تکراری‌ها را حذف می‌کند)
 * POST { type: "signal", kind, payload } | { type: "message", body }
 */
type Ctx = { params: Promise<{ id: string }> };

const KINDS = ["hello", "offer", "answer", "ice", "bye"];

export async function GET(req: NextRequest, { params }: Ctx) {
  const visit = await loadVisit((await params).id);
  if (!visit) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const since = new Date(sp.get("since") ?? Date.now());
  const msgSince = new Date(sp.get("msgSince") ?? 0);
  const a = visit.appointment;

  const [signals, messages] = await Promise.all([
    db.visitSignal.findMany({
      where: { appointmentId: a.id, fromUserId: { not: visit.user.id }, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
    db.visitMessage.findMany({ where: { appointmentId: a.id, createdAt: { gte: msgSince } }, orderBy: { createdAt: "asc" } }),
  ]);
  const lastSeen = await db.visitSignal.findFirst({
    where: { appointmentId: a.id, fromUserId: { not: visit.user.id }, kind: "hello" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    now: new Date().toISOString(),
    status: a.status,
    // طرف مقابل در ۲۰ ثانیه‌ی اخیر حضور داشته است
    otherOnline: Boolean(lastSeen && Date.now() - lastSeen.createdAt.getTime() < 20_000),
    signals: signals.map((s) => ({ id: s.id, kind: s.kind, payload: s.payload, at: s.createdAt })),
    messages: messages.map((m) => ({ id: m.id, mine: m.userId === visit.user.id, body: m.body, at: m.createdAt })),
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const visit = await loadVisit((await params).id);
  if (!visit) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const a = visit.appointment;
  if (!canJoin(a)) return NextResponse.json({ error: "closed" }, { status: 409 });

  const body = await req.json().catch(() => null);
  if (body?.type === "signal" && KINDS.includes(body.kind) && typeof body.payload === "string" && body.payload.length < 20_000) {
    await db.visitSignal.create({ data: { appointmentId: a.id, fromUserId: visit.user.id, kind: body.kind, payload: body.payload } });
    // اولین حضور متخصص، ویزیت را «در حال برگزاری» می‌کند
    if (visit.role === "clinician" && body.kind === "hello" && a.status === "CONFIRMED") {
      await db.appointment.update({ where: { id: a.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
    }
    return NextResponse.json({ ok: true });
  }
  if (body?.type === "message" && typeof body.body === "string" && body.body.trim() && body.body.length <= 2000) {
    await db.visitMessage.create({ data: { appointmentId: a.id, userId: visit.user.id, body: body.body.trim() } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
