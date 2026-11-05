/**
 * ابزارهای مشترک آکادمی (قابل استفاده در سرور و کلاینت)
 */
import { toPersianDigits } from "./scoring";

export const COURSE_LEVEL: Record<string, string> = {
  BEGINNER: "مقدماتی",
  INTERMEDIATE: "متوسط",
  ADVANCED: "پیشرفته",
};

export const LESSON_KIND: Record<string, { label: string; icon: string }> = {
  VIDEO: { label: "ویدیو", icon: "▶" },
  TEXT: { label: "متن", icon: "☰" },
  LIVE: { label: "کلاس زنده", icon: "●" },
};

/** رنگ جلد دوره‌ها؛ هر رنگ یک گرادیان ملایم و یک رنگ متن دارد */
export const COURSE_THEMES: Record<string, { label: string; cover: string; ink: string }> = {
  brand: { label: "سبزآبی", cover: "from-brand-400 to-brand-700", ink: "text-brand-700" },
  calm: { label: "اسطوخودوسی", cover: "from-calm-500 to-calm-700", ink: "text-calm-700" },
  warm: { label: "هلویی", cover: "from-warm-500 to-warm-600", ink: "text-warm-600" },
  sky: { label: "آبی آسمانی", cover: "from-sky-400 to-sky-700", ink: "text-sky-700" },
  rose: { label: "گلبهی", cover: "from-rose-400 to-rose-600", ink: "text-rose-600" },
};

export function themeOf(t: string) {
  return COURSE_THEMES[t] ?? COURSE_THEMES.brand;
}

/** پنجره‌ی زمانی نمایش لینک کلاس زنده: از ۳۰ دقیقه قبل تا ۳ ساعت بعد از شروع */
export const LIVE_OPEN_BEFORE_MIN = 30;
export const LIVE_OPEN_AFTER_MIN = 180;

export function liveState(liveAt: Date | null, now = Date.now()): "none" | "upcoming" | "open" | "past" {
  if (!liveAt) return "none";
  const t = liveAt.getTime();
  if (now < t - LIVE_OPEN_BEFORE_MIN * 60_000) return "upcoming";
  if (now <= t + LIVE_OPEN_AFTER_MIN * 60_000) return "open";
  return "past";
}

export type VideoSource = { type: "file"; src: string } | { type: "embed"; src: string } | null;

/** تبدیل لینک ویدیو به منبع پخش. فقط لینک‌های https (یا مسیر محلی) پذیرفته می‌شوند. */
export function videoSource(url: string | null | undefined): VideoSource {
  if (!url) return null;
  const u = url.trim();
  if (u.startsWith("/")) return { type: "file", src: u };
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "aparat.com") {
    const m = /^\/v\/([A-Za-z0-9]+)/.exec(parsed.pathname);
    if (m) return { type: "embed", src: `https://www.aparat.com/video/video/embed/videohash/${m[1]}/vt/frame` };
    if (parsed.pathname.includes("/embed/")) return { type: "embed", src: u };
  }
  if (host === "youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v") ?? /\/embed\/([\w-]+)/.exec(parsed.pathname)?.[1];
    if (id && /^[\w-]{6,20}$/.test(id)) return { type: "embed", src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (/\.(mp4|webm|m3u8|ogg)$/i.test(parsed.pathname)) return { type: "file", src: u };
  return null;
}

export function isValidVideoUrl(url: string) {
  return videoSource(url) !== null;
}

/** قیمت پس از تخفیف (گرد به هزار تومان پایین) */
export function discounted(price: number, percent: number) {
  if (percent >= 100) return 0;
  const p = Math.round((price * (100 - percent)) / 100);
  return Math.max(0, Math.floor(p / 1000) * 1000);
}

export function formatMinutes(min: number) {
  if (min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${toPersianDigits(m)} دقیقه`;
  return m ? `${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه` : `${toPersianDigits(h)} ساعت`;
}

/** کد استعلام گواهی، بدون حروف مبهم (0/O و 1/I) */
export function makeCertificateCode(random: (n: number) => number) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => abc[random(abc.length)]).join("");
  return `MM-${part()}-${part()}`;
}

export function normalizeCertificateCode(raw: string) {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = c.startsWith("MM") ? c.slice(2) : c;
  return body.length === 8 ? `MM-${body.slice(0, 4)}-${body.slice(4)}` : null;
}
