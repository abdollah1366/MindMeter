import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mindmeter.ir"),
  title: {
    default: "مایندمتر | تست‌های روانشناسی آنلاین",
    template: "%s | مایندمتر",
  },
  description: "مایندمتر؛ مجموعه‌ای از تست‌های روانشناسی آنلاین و رایگان به زبان فارسی.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
