"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/track-client";

/** شمارش بازدید هر صفحه، از جمله جابه‌جایی‌های داخلی بدون بارگذاری مجدد */
export default function Analytics() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    track("view");
  }, [pathname]);
  return null;
}
