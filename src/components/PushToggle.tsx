"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/server/notifications";

function urlBase64ToUint8Array(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "busy";

/** فعال/غیرفعال کردن اعلان مرورگر روی همین دستگاه */
export default function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [publicKey]);

  async function enable() {
    setError(null);
    setState("busy");
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
      const res = await savePushSubscription(JSON.stringify(sub.toJSON()));
      setState(res.ok ? "on" : "off");
      if (!res.ok) setError("ثبت اعلان انجام نشد.");
    } catch {
      setError("مرورگر اجازه‌ی اعلان نداد. اگر از حالت ناشناس یا مرورگر داخل برنامه استفاده می‌کنید، با کروم یا سافاری امتحان کنید.");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "loading") return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">اعلان روی این دستگاه</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            {state === "unsupported"
              ? publicKey
                ? "این مرورگر از اعلان پشتیبانی نمی‌کند. در آیفون، ابتدا سایت را به صفحه‌ی اصلی اضافه (نصب) کنید."
                : "اعلان مرورگر هنوز روی سرور فعال نشده است."
              : state === "denied"
                ? "اجازه‌ی اعلان در تنظیمات مرورگر بسته شده است. از تنظیمات سایت آن را باز کنید."
                : "یادآوری نوبت و کلاس زنده حتی وقتی سایت بسته است نمایش داده می‌شود."}
          </p>
        </div>
        {(state === "on" || state === "off" || state === "busy") && (
          <button
            disabled={state === "busy"}
            onClick={state === "on" ? disable : enable}
            className={`rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60 ${state === "on" ? "bg-slate-100 text-slate-600" : "bg-brand-600 text-white"}`}
          >
            {state === "busy" ? "…" : state === "on" ? "خاموش کردن" : "روشن کردن اعلان"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
