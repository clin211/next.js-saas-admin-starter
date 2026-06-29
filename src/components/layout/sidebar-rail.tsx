"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { findActiveTop, firstLeafHref, nav } from "@/config/nav";
import { cn } from "@/lib/utils";

/**
 * 深色恒宽一级导航栏（= var(--shell-rail)，约 Panel 的 1/4）。
 * 顶部品牌 Logo（与 Panel 头/Topbar 同高，垂直居中）→ 中部「图标 + 文字」纵向堆叠的模块项
 * （激活态直接使用主题色实心标）→ 底部系统状态。§4.4
 */
export function SidebarRail() {
  const pathname = usePathname();
  const activeRail = findActiveTop(nav, pathname);

  return (
    <aside
      style={{ width: "var(--shell-rail)" }}
      className="hidden shrink-0 grow-0 flex-col bg-rail md:flex"
    >
      {/* 顶部：品牌 Logo（渐变标，与 Panel 头「管理控制台」两行同高） */}
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ height: "var(--shell-header)" }}
      >
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm"
          style={{ backgroundImage: "linear-gradient(135deg, var(--brand-from), var(--brand-to))" }}
        >
          SA
        </span>
      </div>

      {/* 中部：一级模块（图标在上、文字在下，居中堆叠）；点击跳该模块首个叶子 */}
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeRail?.id;
          const href = firstLeafHref(item) ?? item.href ?? "/";
          return (
            <Link
              key={item.id}
              href={href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-rail-foreground/70 transition-colors hover:bg-rail-accent/60 hover:text-rail-foreground",
                active &&
                  "bg-primary font-medium text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {Icon ? <Icon className="size-5" /> : null}
              <span className="truncate text-[10px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部：系统状态（脉冲绿点 + 在线文案） */}
      <div className="flex items-center justify-center gap-1.5 px-1 pb-3 pt-2 text-rail-foreground/70">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <span className="text-[10px] leading-none">系统在线</span>
      </div>
    </aside>
  );
}
