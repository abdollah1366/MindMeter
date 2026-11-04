import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mindmeter.ir"),
  title: {
    default: "مایندمتر | تست‌های روانشناسی آنلاین",
    template: "%s | مایندمتر",
  },
  description: "مایندمتر؛ مجموعه‌ای از تست‌های روانشناسی آنلاین و رایگان به زبان فارسی.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const userLabel = user ? user.firstName ?? "پرونده‌ی من" : null;
  const extraLinks = [
    ...(user && (user.role === "PSYCHOLOGIST" || user.role === "PHYSICIAN") ? [{ href: "/panel", label: "پنل متخصص" }] : []),
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "مدیریت" }] : []),
  ];
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col font-sans">
        <Header userLabel={userLabel} extraLinks={extraLinks} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 print:p-0">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
