import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/panel", "/api/", "/reports/", "/pay/", "/visit/", "/my-results", "/my-courses", "/appointments", "/profile", "/save-pending", "/login", "/referral/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
