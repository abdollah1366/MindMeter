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

/**
 * ارسال پیامک متنی (یادآوری‌ها). با کاوه‌نگار از خط KAVENEGAR_SENDER ارسال می‌شود.
 * بدون تنظیم، در حالت توسعه متن در ترمینال چاپ می‌شود و در production بی‌صدا رد می‌شود.
 * خروجی: آیا ارسال شد
 */
export async function sendTextSms(phone: string, message: string) {
  const key = process.env.KAVENEGAR_API_KEY;
  const sender = process.env.KAVENEGAR_SENDER;
  if (!key || !sender) {
    if (process.env.NODE_ENV !== "production") console.log(`\n📱 [DEV] پیامک به ${phone}:\n${message}\n`);
    return false;
  }
  const url = new URL(`https://api.kavenegar.com/v1/${key}/sms/send.json`);
  url.searchParams.set("receptor", phone);
  url.searchParams.set("sender", sender);
  url.searchParams.set("message", message);
  const res = await fetch(url, { method: "POST", cache: "no-store" });
  return res.ok;
}
