/**
 * ذخیره‌ی موقت نتایج کاربر مهمان در مرورگر (localStorage).
 * کاربر واردشده نتایجش در پایگاه داده ذخیره می‌شود.
 */
import type { Answers } from "./scoring";

export type SavedResult = {
  testSlug: string;
  testTitle: string;
  summary: string;
  takenAt: number;
};

const KEY = "mindmeter:results";
const PENDING = "mindmeter:pending";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadResults = () => read<SavedResult[]>(KEY, []);
export const saveResult = (r: SavedResult) => write(KEY, [r, ...loadResults()].slice(0, 50));
export const clearResults = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};

/** نتیجه‌ای که کاربر مهمان بعد از ورود می‌خواهد در پرونده ذخیره کند */
export type PendingResult = { slug: string; answers: Answers };
export const setPending = (p: PendingResult) => write(PENDING, p);
export const takePending = (): PendingResult | null => {
  const p = read<PendingResult | null>(PENDING, null);
  try {
    localStorage.removeItem(PENDING);
  } catch {}
  return p;
};
