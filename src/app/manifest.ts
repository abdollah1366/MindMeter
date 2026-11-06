import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "مایندمتر | تست‌های روانشناسی",
    short_name: "مایندمتر",
    description: SITE_DESCRIPTION,
    lang: "fa",
    dir: "rtl",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f7f4",
    theme_color: "#24786f",
    categories: ["health", "education", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "همه‌ی تست‌ها", url: "/tests", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "پرونده‌ی من", url: "/my-results", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "دوره‌های من", url: "/my-courses", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
