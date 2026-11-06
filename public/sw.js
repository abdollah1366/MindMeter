/*
 * سرویس‌ورکر مایندمتر
 * - فایل‌های ثابت (_next/static، فونت، آیکون) کش می‌شوند: cache-first
 * - صفحه‌ها همیشه از شبکه گرفته می‌شوند تا اطلاعات تازه و شخصی باشد؛
 *   فقط صفحه‌های عمومی (تست‌ها، مقالات، آکادمی) برای حالت آفلاین ذخیره می‌شوند
 * - اگر شبکه نباشد و صفحه ذخیره نشده باشد، صفحه‌ی /offline نمایش داده می‌شود
 * - درخواست‌های غیر GET، API، پرداخت، ویزیت و پنل‌ها هرگز کش نمی‌شوند
 */
const VERSION = "mm-v2";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const OFFLINE = "/offline";
const PUBLIC_PAGES = /^\/($|tests|categories|blog|academy|about|clinicians$)/;
const NEVER = /^\/(api|admin|panel|pay|visit|reports|login|profile|my-|appointments|referral|save-pending|certificates|notifications)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    if (NEVER.test(url.pathname)) {
      event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
      return;
    }
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && PUBLIC_PAGES.test(url.pathname)) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE))),
    );
  }
});

// اعلان Push (یادآوری نوبت و کلاس زنده)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "مایندمتر", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "مایندمتر", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      dir: "rtl",
      lang: "fa",
      tag: data.tag,
      data: { url: data.url || "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url === url && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
