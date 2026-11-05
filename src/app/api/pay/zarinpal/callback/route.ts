import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { zarinpalVerify } from "@/lib/zarinpal";
import { afterPaymentPath, markPaid } from "@/lib/payments";

/** بازگشت از درگاه زرین‌پال */
export async function GET(req: NextRequest) {
  const authority = req.nextUrl.searchParams.get("Authority") ?? "";
  const status = req.nextUrl.searchParams.get("Status");
  const payment = authority ? await db.payment.findUnique({ where: { authority } }) : null;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));

  if (!payment) return to("/appointments?pay=notfound");
  if (payment.status === "PAID") return to(await afterPaymentPath(payment));
  if (status !== "OK") {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return to(`/pay/${payment.id}?failed=1`);
  }
  const result = await zarinpalVerify(payment.amount, authority);
  if (!result.ok) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return to(`/pay/${payment.id}?failed=1`);
  }
  await markPaid(payment.id, result.refId);
  return to(await afterPaymentPath(payment));
}
