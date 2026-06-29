"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { findTrail, firstLeafHref, nav } from "@/config/nav";
import { cn } from "@/lib/utils";

/**
 * 面包屑：按当前路径在 nav 树中回溯出「顶层模块 → … → 当前页」轨迹。
 * 每一项都可点：叶子跳自身，组节点跳其首个叶子（激活该层级下的第一个子菜单）；
 * 末项（当前页）亦可点，但保留加重样式以示当前位置。仅 md+ 显示。§4.4
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const trail = findTrail(nav, pathname);
  if (trail.length === 0) return null;

  return (
    <nav aria-label="面包屑" className="hidden min-w-0 items-center gap-0.5 text-[12px] md:flex">
      {trail.map((item, index) => {
        const last = index === trail.length - 1;
        const href = item.href ?? firstLeafHref(item);
        return (
          <span key={item.id} className="flex min-w-0 items-center gap-0.5">
            {index > 0 ? (
              <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
            ) : null}
            {href ? (
              <Link
                href={href}
                className={cn(
                  "truncate transition-colors hover:text-foreground",
                  last ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-muted-foreground">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
