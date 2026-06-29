import type { ReactNode } from "react";

/**
 * 未登录路由分组布局：全屏画布，由各页面自行组织版式
 * （登录页为「品牌分屏」，注册页为「居中卡片」）。分组不污染 URL。§3.2 / §3.3
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-svh bg-background">{children}</div>;
}
