import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import Pwa from "@/components/Pwa";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { db } from "@/lib/db";
import { toPersianDigits } from "@/lib/scoring";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "مایندمتر | تست‌های روانشناسی آنلاین",
    template: "%s | مایندمتر",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", locale: "fa_IR", siteName: SITE_NAME, title: "مایندمتر | تست‌های روانشناسی آنلاین", description: SITE_DESCRIPTION },
  twitter: { card: "summary" },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#24786f", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const userLabel = user ? user.firstName ?? "پرونده‌ی من" : null;
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }).catch(() => 0) : 0;
  const extraLinks = [
    ...(user
      ? [
          { href: "/my-courses", label: "دوره‌های من" },
          { href: "/appointments", label: "نوبت‌های من" },
          { href: "/notifications", label: unread ? `اعلان‌ها (${toPersianDigits(unread)})` : "اعلان‌ها" },
        ]
      : []),
    ...(user && (user.role === "PSYCHOLOGIST" || user.role === "PHYSICIAN") ? [{ href: "/panel", label: "پنل متخصص" }] : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "مدیریت" }] : []),
  ];
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col font-sans">
        <Header userLabel={userLabel} extraLinks={extraLinks} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:p-0">{children}</main>
        <Footer />
        <Analytics />
        <Pwa />
      </body>
    </html>
  );
}
