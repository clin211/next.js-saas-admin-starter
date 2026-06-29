import { env } from "@/lib/env";

export const siteConfig = {
  name: "GC Console",
  title: {
    default: "GC Console",
    template: "%s · GC Console",
  },
  description: "SaaS 管理控制台 — 基于 Next.js App Router 的前端基建",
  url: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
