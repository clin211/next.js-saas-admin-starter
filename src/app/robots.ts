import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robot(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    // sitemap.xml 暂未实现，先占位指向未来位置
    sitemap: new URL("/sitemap.xml", siteConfig.url).href,
    host: siteConfig.url,
  };
}
