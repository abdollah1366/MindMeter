import "server-only";

/**
 * ارسال پیامک کد ورود.
 * اگر کلید کاوه‌نگار تنظیم شده باشد از سرویس «Verify Lookup» استفاده می‌شود؛
 * در غیر این صورت (فقط در حالت توسعه) کد در ترمینال چاپ می‌شود.
 * برای سرویس‌دهنده‌ی دیگر (SMS.ir، ملی‌پیامک و…) کافی است همین تابع را تغییر دهید.
 */
export async function sendOtpSms(phone: string, code: string) {
  const key = process.env.KAVENEGAR_API_KEY;
  const template = process.env.KAVENEGAR_OTP_TEMPLATE;

  if (!key || !template) {
    if (process.env.NODE_ENV === "production") throw new Error("SMS provider is not configured");
    console.log(`\n📱 [DEV] کد ورود برای ${phone}: ${code}\n`);
    return;
  }

  const url = new URL(`https://api.kavenegar.com/v1/${key}/verify/lookup.json`);
  url.searchParams.set("receptor", phone);
  url.searchParams.set("token", code);
  url.searchParams.set("template", template);
  const res = await fetch(url, { method: "POST", cache: "no-store" });
  if (!res.ok) throw new Error(`Kavenegar error ${res.status}`);
}
