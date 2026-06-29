import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasPermission, type Permission } from "@/config/permissions";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  decodeSession,
  encodeSession,
  type Session,
} from "./session-codec";

/**
 * 服务端会话访问层（仅 server / RSC / server action 引用）。
 * 客户端不要 import 本文件（含 next/headers），请用 `./session-provider`。
 *
 * PROD 接缝：把 getSession() 内的「解码票据」替换为「向后端校验」即可，
 * 例如 `apiClient.get<Session>("/auth/session")`，签名与下游保持不变。§10.2
 */

/** 读当前会话；无会话或票据非法（含签名不符）返回 null。 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return await decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
}

/** 要求已登录，否则跳登录页（带回调地址）。 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * 页面/动作级权限闸（服务端第二道）。无权限 → 跳 403。
 * 用法（RSC 页面顶部）：`await requirePermission("user:read")`。§10.2
 */
export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await requireSession();
  if (!hasPermission(session.role, permission)) redirect("/error/403");
  return session;
}

/** 写入会话 cookie（httpOnly，HMAC 签名）。 */
export async function setSessionCookie(session: Session): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await encodeSession(session), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
  });
}

/** 清除会话 cookie。 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
