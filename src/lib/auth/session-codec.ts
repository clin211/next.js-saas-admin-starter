import { z } from "zod";

import { assertProdAuthSecret, env } from "@/lib/env";
import { ROLES, type Role } from "@/config/permissions";

/**
 * 会话编解码 + 类型 —— **同构**，无 `next/headers` 依赖，
 * 可被 RSC（Node）、proxy（Edge）、客户端组件安全引用。
 *
 * Cookie 内存放「**HMAC 签名**的会话票据」，格式 `payload.signature`：
 *  - payload = base64url(JSON(Session))，signature = base64url(HMAC-SHA256(AUTH_SECRET, payload))。
 *  - 签名用 WebCrypto（`globalThis.crypto.subtle`），Node 18+/Edge/浏览器均可用，不引 Node 专有 `crypto`。
 *  - 任何人改 payload（伪造 role/plan）→ 签名校验失败 → decode 返回 null。
 *  - 开发期：由 sign-in 直接写入（见 DEV_SESSION）。
 *  - 生产期：仍由后端登录后下发同形状票据，或改 getSession() 走 /auth/session 校验。
 *  票据 httpOnly，客户端永不接触明文。§7.4 / §10.2
 */

/** 与 proxy.ts 守卫、sign-in/sign-out 共用的会话 cookie 名。§3.4 */
export const SESSION_COOKIE = "session";
/** 单次会话有效期（7 天），对齐「记住我」语义。 */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** 订阅计划：FeatureGate 闸（§10.3）的维度。 */
export const PLANS = ["free", "pro", "enterprise"] as const;
export type Plan = (typeof PLANS)[number];

export const sessionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().optional(),
});

/** Session 的运行时形状即其校验 schema —— Zod 单一事实源。 */
export const sessionSchema = z.object({
  user: sessionUserSchema,
  role: z.enum(ROLES) as unknown as z.ZodType<Role>,
  plan: z.enum(PLANS),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type Session = z.infer<typeof sessionSchema>;

/* -------------------------------------------------------------------------- */
/* 同构 base64url（Node 用 Buffer；Edge/浏览器降级 TextEncoder/Decoder）        */
/* -------------------------------------------------------------------------- */
function toBase64Url(input: string): string {
  const bytes: Uint8Array =
    typeof Buffer !== "undefined" ? Buffer.from(input, "utf-8") : new TextEncoder().encode(input);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const bytes = bytesFromBase64Url(input);
  return typeof Buffer !== "undefined"
    ? Buffer.from(bytes).toString("utf-8")
    : new TextDecoder().decode(bytes);
}

/** base64url → 原始字节（同构；保留任意字节，签名校验用）。 */
function bytesFromBase64Url(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 字节 → base64url（同构；签名编码用）。 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* -------------------------------------------------------------------------- */
/* HMAC-SHA256 签名（WebCrypto，同构）                                          */
/* -------------------------------------------------------------------------- */
const encoder = new TextEncoder();

/** 取 AUTH_SECRET 对应的 HMAC key（每次调用复用底层 key import）。 */
function getHmacKey(): Promise<CryptoKey> {
  // 运行期生产闸：首次真实用到密钥即校验（构建期不调用此函数，故不破坏 build）。
  assertProdAuthSecret();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** 用 AUTH_SECRET 对 payload 计算 HMAC-SHA256，返回 base64url 签名。 */
async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

/**
 * 把 Session 编码为可放入 cookie 的签名票据：`base64url(JSON).base64url(HMAC)`。
 * 注意：现为 async（依赖 WebCrypto 异步 API）。§7.4
 */
export async function encodeSession(session: Session): Promise<string> {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

/**
 * 把 cookie 原值解析回 Session；签名不符/格式错误/zod 失败/缺失 → 返回 null（绝不抛）。
 * 用 `crypto.subtle.verify` 做常量时间比较。现为 async。§7.4 / §10.2
 */
export async function decodeSession(raw: string | undefined | null): Promise<Session | null> {
  if (!raw) return null;
  try {
    const dot = raw.lastIndexOf(".");
    if (dot <= 0 || dot === raw.length - 1) return null;

    const payload = raw.slice(0, dot);
    const sigBytes = bytesFromBase64Url(raw.slice(dot + 1));

    const key = await getHmacKey();
    // sigBytes 是 Uint8Array<ArrayBufferLike>，新版 lib.dom 下需显式收窄为 BufferSource。
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as BufferSource,
      encoder.encode(payload),
    );
    if (!ok) return null;

    const parsed = sessionSchema.safeParse(JSON.parse(fromBase64Url(payload)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 开发期桩数据（生产由真实认证后端提供）                                       */
/* -------------------------------------------------------------------------- */

/** 开发期默认会话：owner + pro 计划，便于体验全部权限与 FeatureGate。 */
export const DEV_SESSION: Session = {
  user: { id: "u-dev", name: "开发者", email: "dev@example.com" },
  role: "owner",
  plan: "pro",
};
