import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // در حالت توسعه، باز کردن سایت با 127.0.0.1 یا IP شبکه (مثلاً از موبایل) را مجاز می‌کند.
  // بدون این، Next.js فایل‌های جاوااسکریپت را مسدود می‌کند و دکمه‌ها کار نمی‌کنند.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
