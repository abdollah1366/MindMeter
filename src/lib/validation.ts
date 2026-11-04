/** تبدیل ارقام فارسی و عربی به انگلیسی */
export function toEnglishDigits(s: string) {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/**
 * نرمال‌سازی شماره موبایل ایران به فرم 09xxxxxxxxx.
 * ورودی‌های قابل قبول: 0912…، 912…، +98912…، 0098912…، با ارقام فارسی یا فاصله.
 */
export function normalizeIranMobile(input: string): string | null {
  let s = toEnglishDigits(input).replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = s.slice(3);
  else if (s.startsWith("0098")) s = s.slice(4);
  else if (s.startsWith("98") && s.length === 12) s = s.slice(2);
  if (s.startsWith("9") && s.length === 10) s = "0" + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

/** اعتبارسنجی کد ملی ایران با رقم کنترل */
export function isValidNationalId(input: string): boolean {
  const code = toEnglishDigits(input).trim();
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits[9];
  const sum = digits.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const r = sum % 11;
  return r < 2 ? check === r : check === 11 - r;
}
