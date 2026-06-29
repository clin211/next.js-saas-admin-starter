"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { CommandMenu } from "@/components/layout/command-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarPanel } from "@/components/layout/sidebar-panel";
import { SidebarRail } from "@/components/layout/sidebar-rail";
import { Topbar } from "@/components/layout/topbar";

/** 与 globals.css 令牌同步：Panel 展开档 / 收起=0（完全收起，仅留 Rail）。 */
const PANEL_EXPANDED = 240;
const PANEL_COLLAPSED = 0;

/**
 * 应用骨架：Rail（恒定宽度）+ Panel（展开 240 / 收起 0，完全收起）+ 内容区（Topbar + main）。
 * 双约束：Rail shrink-0/grow-0 不参与动画；Panel 在 0 与展开档间 Motion 插值。
 * 收起/展开由 Topbar 的侧栏按钮统一触发（Panel 头不再放切换器）。移动端（<md）收进 Sheet。§4.4
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // 全局 ⌘K / Ctrl+K 命令面板
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const panelWidth = collapsed ? PANEL_COLLAPSED : PANEL_EXPANDED;

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      {/* ① Rail：宽度恒定，不参与任何宽度动画 */}
      <SidebarRail />

      {/* ② Panel：展开 240 / 收起 0（完全收起，不留图标列） */}
      <SidebarPanel collapsed={collapsed} width={panelWidth} />

      {/* ③ 内容区：吸收剩余宽度，min-w-0 防撑爆 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">{children}</div>
        </main>
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
    </div>
  );
}
