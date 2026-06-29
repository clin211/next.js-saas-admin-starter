import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** dev 期 AUTH_SECRET 默认值（本地免配置）；生产必须覆盖，见 assertProdAuthSecret。 */
export const AUTH_SECRET_DEV_DEFAULT = "dev-insecure-secret-change-me-please-32chars";

/**
 * 类型安全环境变量单一来源。仅通过 `env.*` 读 `process.env`，启动即校验。
 * 缺失/非法即抛。键名见 `.env.example`。
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /**
     * 会话票据 HMAC 签名密钥（session-codec 用 WebCrypto HMAC-SHA256 签名/校验 cookie）。
     * - dev：内置默认值，本地免配置；
     * - prod：必须设为强随机值（如 `openssl rand -base64 32`），否则下方
     *   assertProdAuthSecret() 会在生产环境 fail-loud，避免伪造任意 role/plan。§7.4 / §10.2
     */
    AUTH_SECRET: z.string().min(16).default(AUTH_SECRET_DEV_DEFAULT),
  },
  client: {
    /** 站点绝对地址；服务端解析同源 mock 的绝对 URL、生成元数据等用。 */
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    /**
     * 真实后端基地址（含前缀，如 https://api.example.com）。
     * 不设时 → 开发期回落到同源 `/api` mock（见 lib/api/client.ts）。
     * 接真实后端：只需在 .env.local 设此项，客户端零改动即可切换。
     */
    NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
});

/* -------------------------------------------------------------------------- */
/* 生产闸：AUTH_SECRET 在生产环境必须是强随机值，禁止沿用 dev 默认值。           */
/* -------------------------------------------------------------------------- */
// 刻意做成「运行期函数」而非模块求值期 throw：后者会在 `next build`
// （NODE_ENV=production）收集页面数据时触发、导致构建失败。改为在真实鉴权请求
// （getSession / signIn 经 session-codec.getHmacKey）首次用到密钥时校验——
// 既保证生产未配置时 fail-loud，又不破坏构建。
export function assertProdAuthSecret(): void {
  if (
    env.NODE_ENV === "production" &&
    (!env.AUTH_SECRET || env.AUTH_SECRET === AUTH_SECRET_DEV_DEFAULT)
  ) {
    throw new Error(
      "AUTH_SECRET 必须在生产环境设为强随机值（如 openssl rand -base64 32），禁止沿用 dev 默认值",
    );
  }
}
