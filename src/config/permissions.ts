/**
 * RBAC 权限矩阵（骨架）。前端显隐仅为体验，后端做最终校验（防 IDOR）。§10.2
 * 角色 × 资源×动作；真实数据由后端/数据库提供，前端按角色取交集。
 */
export type Permission = "user:read" | "user:write" | "role:read" | "role:write" | "audit:read";

/**
 * 角色常量：既是 RBAC 矩阵的维度，也供 Zod schema 复用（单一事实源）。
 * 全小写枚举；档位 owner > admin > member > viewer。
 * （曾误用 PascalCase 的 "Console"，与产品名 next.js-saas-admin-starter 及 JS 全局 console 撞名，已纠正为 admin。）
 */
export const ROLES = ["owner", "admin", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const permissionMatrix: Record<Role, Partial<Record<Permission, boolean>>> = {
  owner: {
    "user:read": true,
    "user:write": true,
    "role:read": true,
    "role:write": true,
    "audit:read": true,
  },
  admin: {
    "user:read": true,
    "user:write": true,
    "role:read": true,
    "audit:read": true,
  },
  member: { "user:read": true },
  viewer: { "user:read": true },
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionMatrix[role]?.[permission] ?? false;
}
