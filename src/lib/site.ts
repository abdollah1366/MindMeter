/** آدرس اصلی سایت برای sitemap، داده‌ی ساختاریافته و لینک‌های کامل */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mindmeter.ir").replace(/\/$/, "");
export const SITE_NAME = "مایندمتر";
export const SITE_DESCRIPTION = "مایندمتر؛ تست‌های روانشناسی استاندارد و رایگان به زبان فارسی، گزارش قابل چاپ، ویزیت آنلاین با روانشناس و آکادمی آموزش روانشناسی.";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
