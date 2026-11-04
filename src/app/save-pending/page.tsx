"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { takePending } from "@/lib/history";
import { saveTestResult } from "@/server/results";

/** بعد از ورود، نتیجه‌ی تستی که کاربر به‌عنوان مهمان انجام داده در پرونده ذخیره می‌شود */
export default function SavePendingPage() {
  const router = useRouter();
  const [message, setMessage] = useState("در حال ذخیره‌ی نتیجه در پرونده‌ی شما…");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const pending = takePending();
    if (!pending) {
      router.replace("/my-results");
      return;
    }
    saveTestResult(pending.slug, pending.answers).then((res) => {
      if (res.ok) router.replace(`/reports/${res.id}`);
      else if (res.reason === "auth") router.replace("/login?next=/save-pending");
      else setMessage("ذخیره‌ی نتیجه ممکن نشد. لطفاً تست را دوباره انجام دهید.");
    });
  }, [router]);

  return <p className="py-20 text-center text-slate-500">{message}</p>;
}
