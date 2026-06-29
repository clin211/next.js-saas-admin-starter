"use client";

import { createContext, useContext, type ReactNode } from "react";

import { hasPermission, type Permission } from "@/config/permissions";
import { makeKeys, type QueryKeys } from "@/lib/api/query-keys";
import type { Session } from "./session-codec";

/**
 * 客户端会话上下文。值由 RSC 布局从服务端 getSession() 取得后下发，
 * 故客户端永不接触 cookie 明文，且与服务端权限判定同源。§10.2
 */
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: Session | null;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** 当前会话；未登录（不在 dashboard 分组内）时为 null。 */
export function useSession(): Session | null {
  return useContext(SessionContext);
}

/** 权限判定 hook（驱动按钮/菜单显隐，仅体验；后端兜底）。§10.2 */
export function useHasPermission(permission: Permission): boolean {
  const session = useContext(SessionContext);
  return session ? hasPermission(session.role, permission) : false;
}

/**
 * 全局 Query Key 工厂 hook（不再按租户作用域，故也不再依赖会话）。
 * 永远返回 makeKeys()——key 只是缓存维度的强类型标识，不携带鉴权语义，
 * 是否真正发请求由各 hook 自身（如 `enabled`）决定。
 *
 * 各 feature 域级 key 见各自的 `query-keys.ts`（如 features/projects）。
 */
export function useQueryKeys(): QueryKeys {
  return makeKeys();
}
