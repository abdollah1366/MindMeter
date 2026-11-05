/** ارسال بازدید یا رویداد به /api/track (بدون کوکی؛ «Do Not Track» رعایت می‌شود) */
export function track(kind: "view" | "test_start" | "test_complete", extra: { ref?: string } = {}) {
  if (typeof window === "undefined") return;
  if (navigator.doNotTrack === "1") return;
  const params = new URLSearchParams(window.location.search);
  const payload = JSON.stringify({
    kind,
    path: window.location.pathname,
    referrer: kind === "view" ? document.referrer : undefined,
    source: params.get("utm_source") ?? undefined,
    ...extra,
  });
  try {
    if (navigator.sendBeacon?.(new URL("/api/track", window.location.origin), new Blob([payload], { type: "text/plain" }))) return;
  } catch {}
  fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {});
}
