import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** هش رمز با scrypt و نمک تصادفی؛ ذخیره به صورت «نمک:کلید» با نماد هگزادسیمال */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

// برای اینکه زمان پاسخ در صورت نبودن نام کاربری تقریباً برابر بماند،
// یک هش بیارزش را تنها یک بار میسازیم و در مقایسه استفاده میکنیم.
let dummyHash: string | null = null;

/** بررسی رمز؛ وجود نداشتن هش هم به صورت «نادرست» برگردانده میشود */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    dummyHash ??= await hashPassword("dummy-password-for-timing");
    stored = dummyHash;
  }

  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length === 0) return false;

  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
