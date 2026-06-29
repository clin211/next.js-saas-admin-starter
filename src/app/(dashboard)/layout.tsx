import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/lib/auth/session-provider";
import { getSession } from "@/lib/auth/session";

/**
 * 已登录主应用分组布局：服务端取会话 → 无会话跳登录 → 套应用骨架 +
 * 注入 SessionProvider（客户端 Can / FeatureGate 据此响应）。§3.3 / §10.2
 *
 * 这是与 proxy.ts 守卫互为兜底的服务端第二道：proxy 拦未登录，layout 防 cookie 失效。
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
