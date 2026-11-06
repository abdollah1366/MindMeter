import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // در حالت توسعه، باز کردن سایت با 127.0.0.1 یا IP شبکه (مثلاً از موبایل) را مجاز می‌کند.
  // بدون این، Next.js فایل‌های جاوااسکریپت را مسدود می‌کند و دکمه‌ها کار نمی‌کنند.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  poweredByHeader: false,
  // آپلود عکس و مدارک تا ۵ مگابایت
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // دوربین و میکروفون فقط برای ویزیت آنلاین روی همین دامنه
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()" },
        ],
      },
      {
        // سرویس‌ورکر همیشه تازه بارگیری شود تا نسخه‌ی جدید سریع جایگزین شود
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
