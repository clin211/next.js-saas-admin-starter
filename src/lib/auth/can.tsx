"use client";

import type { ReactNode } from "react";

import { hasPermission, type Permission } from "@/config/permissions";
import { useSession } from "./session-provider";

type CanProps = {
  permission: Permission;
  children: ReactNode;
  /** 无权限时渲染的替代内容。 */
  fallback?: ReactNode;
};

/**
 * 权限闸：导航/按钮按权限显隐。读当前会话角色（响应式）。
 * 前端显隐仅为体验，后端仍做最终校验（防 IDOR）。§10.2
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const session = useSession();
  if (!session || !hasPermission(session.role, permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
