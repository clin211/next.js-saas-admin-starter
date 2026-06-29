"use client";

import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth/session-provider";
import { signOut } from "@/lib/auth/sign-out";
import { notifyInfo } from "@/lib/toast";

type TopbarProps = {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
  onOpenCommand: () => void;
};

/** 页面级上下文 + 全局操作。高度与 Rail Logo / Panel 头对齐（= var(--shell-header)）。§4.4 */
export function Topbar({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobile,
  onOpenCommand,
}: TopbarProps) {
  const session = useSession();

  return (
    <header
      style={{ height: "var(--shell-header)" }}
      className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-4"
    >
      {/* 移动端汉堡：打开合并后的 Rail+Panel 抽屉 */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobile}
        aria-label="打开菜单"
      >
        <Menu className="size-5" />
      </Button>

      {/* 桌面端：收起/展开 Panel（完全收起时仅剩 Rail） */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="size-5" />
        ) : (
          <PanelLeftClose className="size-5" />
        )}
      </Button>

      {/* 面包屑：伸缩控件右侧，按当前路径回溯 nav 轨迹（md+ 显示） */}
      <Breadcrumb />

      <div className="flex-1" />

      {/* ⌘K 搜索触发器 */}
      <Button variant="outline" onClick={onOpenCommand} className="gap-2 text-muted-foreground">
        <Search className="size-4" />
        <span className="hidden sm:inline">搜索…</span>
        <kbd className="hidden rounded bg-muted px-1.5 text-caption text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="通知"
        onClick={() => notifyInfo("暂无新通知", "通知中心将在后续版本接入")}
      >
        <Bell className="size-5" />
      </Button>

      <ThemeToggle />

      {/* 用户菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="用户菜单" className="rounded-full">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-caption font-medium text-primary">
                {initials(session?.user.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate font-medium">{session?.user.name ?? "未登录"}</span>
            <span className="truncate text-caption font-normal text-muted-foreground">
              {session?.user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>个人资料</DropdownMenuItem>
          <DropdownMenuItem>偏好设置</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()}>退出登录</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

/** 取姓名首字母作头像兜底（最多 2 个字符）。 */
function initials(name?: string): string {
  if (!name) return "U";
  return name.trim().slice(0, 1).toUpperCase();
}
