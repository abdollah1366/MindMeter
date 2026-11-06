import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readUploadFile } from "@/lib/uploads";
import { audit } from "@/lib/audit";

/**
 * دریافت فایل با بررسی مجوز:
 * - AVATAR: عمومی
 * - DOCUMENT: صاحب فایل و ادمین
 * - CHAT: دو طرف همان ویزیت
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await db.upload.findUnique({ where: { id } });
  if (!u) return new NextResponse("Not found", { status: 404 });

  if (u.kind !== "AVATAR") {
    const user = await getCurrentUser();
    let ok = Boolean(user && (user.id === u.ownerId || (u.kind === "DOCUMENT" && user.role === "ADMIN")));
    if (!ok && user && u.kind === "CHAT" && u.scopeId) {
      const a = await db.appointment.findUnique({ where: { id: u.scopeId }, include: { clinician: { select: { userId: true } } } });
      ok = Boolean(a && (a.patientId === user.id || a.clinician.userId === user.id));
    }
    if (!ok) return new NextResponse("Not found", { status: 404 });
    if (u.kind === "DOCUMENT" && user!.id !== u.ownerId) await audit(user!.id, "document.view", { targetType: "Upload", targetId: u.id, meta: { owner: u.ownerId } });
  }

  let body: Buffer;
  try {
    body = await readUploadFile(u.storedAs);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  const inline = u.mime.startsWith("image/");
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": u.mime,
      "Content-Length": String(body.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="file.${u.storedAs.split(".").pop()}"; filename*=UTF-8''${encodeURIComponent(u.name)}`,
      "Cache-Control": u.kind === "AVATAR" ? "public, max-age=86400" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
