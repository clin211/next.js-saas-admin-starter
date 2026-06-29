"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { NavTree } from "@/components/layout/nav-tree";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filterVisible, findActiveTop, nav } from "@/config/nav";
import { hasPermission, type Permission } from "@/config/permissions";
import { siteConfig } from "@/config/site";
import { useSession } from "@/lib/auth/session-provider";
import { cn } from "@/lib/utils";

type SidebarPanelProps = {
  collapsed: boolean;
  width: number;
};

/**
 * 当前 Rail 项下的多级页面树（白色 Panel）。
 * 头部：固定标题「创作系统」+ 品牌副标（大写）+ 分割线，与 Rail Logo / Topbar 同高；
 * 列表：递归 NavTree，激活态用柔和底色（不抢主题色的眼），层级弱于 Rail。收起=完全收起（宽 0）。§4.4
 */
export function SidebarPanel({ collapsed, width }: SidebarPanelProps) {
  const pathname = usePathname();
  const session = useSession();
  const activeTop = findActiveTop(nav, pathname);

  // 权限过滤：递归裁掉无权限叶子与随之空掉的组（前端显隐仅为体验，后端兜底）。§10.2
  const items = useMemo(
    () =>
      filterVisible(activeTop?.children ?? [], (item) =>
        !item.permission
          ? true
          : session
            ? hasPermission(session.role, item.permission as Permission)
            : false,
      ),
    [activeTop, session],
  );

  return (
    <motion.aside
      style={{ width }}
      animate={{ width }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      aria-hidden={collapsed || undefined}
      className={cn(
        "hidden shrink-0 flex-col overflow-hidden bg-sidebar md:flex",
        !collapsed && "border-r border-sidebar-border",
      )}
    >
      {/* Panel 头：固定标题 + 品牌副标（与 Rail Logo / Topbar 同高，垂直居中） */}
      <div
        className="flex shrink-0 flex-col justify-center px-4"
        style={{ height: "var(--shell-header)" }}
      >
        <p className="text-body font-semibold text-sidebar-foreground">创作系统</p>
        <p className="mt-0.5 text-overline tracking-wider text-muted-foreground">
          {siteConfig.name.toUpperCase()}
        </p>
      </div>
      <div className="mx-4 border-b border-sidebar-border" />

      <ScrollArea className="flex-1">
        <nav className="px-2 py-3">
          <NavTree items={items} pathname={pathname} />
        </nav>
      </ScrollArea>
    </motion.aside>
  );
}
