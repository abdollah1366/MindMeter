/**
 * ذخیره‌ی نتایج تست‌ها در مرورگر کاربر (localStorage).
 * بعداً که حساب کاربری و پایگاه داده اضافه شد، این فایل را با فراخوانی API جایگزین کنید.
 */

export type SavedResult = {
  testSlug: string;
  testTitle: string;
  score: number;
  maxScore: number;
  resultTitle: string;
  /** زمان به میلی‌ثانیه */
  takenAt: number;
};

const KEY = "mindmeter:results";

export function loadResults(): SavedResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedResult[]) : [];
  } catch {
    return [];
  }
}

export function saveResult(result: SavedResult) {
  try {
    const all = [result, ...loadResults()].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // ذخیره نشد (مثلاً حالت ناشناس)؛ مشکلی نیست
  }
}

export function clearResults() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
