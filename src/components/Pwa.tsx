"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** ثبت سرویس‌ورکر (فقط در نسخه‌ی production) و دکمه‌ی نصب اپلیکیشن */
export default function Pwa() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("mm-install-dismissed") === "1";
    } catch {}
    if (standalone || dismissed) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    // سافاری iOS رویداد نصب ندارد؛ راهنمای «Add to Home Screen» نشان داده می‌شود
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)) {
      setIos(true);
      setHidden(false);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem("mm-install-dismissed", "1");
    } catch {}
  };

  return (
    <div className="no-print fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-brand-100 bg-white p-3 shadow-lg sm:inset-x-auto sm:left-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
      <p className="flex-1 text-xs leading-6 text-slate-600">
        {ios ? (
          <>برای نصب مایندمتر، دکمه‌ی «اشتراک‌گذاری» سافاری و سپس «Add to Home Screen» را بزنید.</>
        ) : (
          <>مایندمتر را مثل یک اپلیکیشن روی گوشی یا کامپیوتر نصب کنید.</>
        )}
      </p>
      {install && (
        <button
          onClick={async () => {
            await install.prompt();
            await install.userChoice.catch(() => null);
            close();
          }}
          className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white"
        >
          نصب
        </button>
      )}
      <button onClick={close} aria-label="بستن" className="px-1 text-slate-400">✕</button>
    </div>
  );
}
