/** قوانین دسترسی به نتایج گفتار — خالص و قابل تست، بدون وابستگی به دیتابیس. */

/** فقط صاحب نتیجه اجازه مشاهده دارد. کاربر مهمان یا کاربر دیگر دسترسی ندارند. */
export function canAccessSpeechResult(viewerId: string | null | undefined, ownerId: string): boolean {
  return Boolean(viewerId) && viewerId === ownerId;
}
