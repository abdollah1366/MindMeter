import "server-only";

/**
 * درگاه پرداخت زرین‌پال (API نسخه‌ی ۴).
 * اگر ZARINPAL_MERCHANT_ID تنظیم نشده باشد، در حالت توسعه «پرداخت آزمایشی» استفاده می‌شود.
 * با ZARINPAL_SANDBOX=true از محیط تست زرین‌پال استفاده می‌شود.
 */
const merchant = () => process.env.ZARINPAL_MERCHANT_ID?.trim();
const base = () =>
  process.env.ZARINPAL_SANDBOX === "true" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";

export function paymentProvider(): "ZARINPAL" | "DEV" {
  if (merchant()) return "ZARINPAL";
  if (process.env.NODE_ENV === "production") throw new Error("ZARINPAL_MERCHANT_ID is not set");
  return "DEV";
}

/** مبلغ به تومان؛ زرین‌پال با currency=IRT تومان می‌گیرد */
export async function zarinpalRequest(amount: number, description: string, callbackUrl: string, mobile?: string) {
  const res = await fetch(`${base()}/pg/v4/payment/request.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      merchant_id: merchant(),
      amount,
      currency: "IRT",
      description,
      callback_url: callbackUrl,
      metadata: mobile ? { mobile } : undefined,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json?.data?.code !== 100) throw new Error(`Zarinpal request failed: ${JSON.stringify(json?.errors ?? json)}`);
  const authority: string = json.data.authority;
  return { authority, url: `${base()}/pg/StartPay/${authority}` };
}

export async function zarinpalVerify(amount: number, authority: string) {
  const res = await fetch(`${base()}/pg/v4/payment/verify.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ merchant_id: merchant(), amount, authority, currency: "IRT" }),
    cache: "no-store",
  });
  const json = await res.json();
  const code = json?.data?.code;
  // ۱۰۰ = موفق، ۱۰۱ = قبلاً تأیید شده
  if (code === 100 || code === 101) return { ok: true as const, refId: String(json.data.ref_id) };
  return { ok: false as const };
}
