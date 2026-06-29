"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { containsActive, isPathActive, type NavItem } from "@/config/nav";
import { cn } from "@/lib/utils";

type NavTreeProps = {
  items: NavItem[];
  pathname: string;
  /** 叶子点击回调（移动端用于关闭抽屉）。 */
  onNavigate?: () => void;
};

/**
 * 递归多级菜单（二..N 级统一在此渲染）。自包含展开态，被 Panel / MobileNav 复用：
 * - 挂载时以「激活路径的全部祖先组」初始化 openIds（默认展开当前所在分支）。
 * - pathname 变化时把激活祖先**合并**进集合——只增不减，永不自动收起用户已展开的组。
 *
 * 层级表达：每深一级的子树包一层带左侧引导线（border-l）的 <ul>，并整体右移 16px，
 * 故多级菜单的从属关系一目了然（类文件树）。组用语义 <button>、叶子用 <Link>。§4.4
 */
export function NavTree({ items, pathname, onNavigate }: NavTreeProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => activeGroupIds(items, pathname));

  // 激活分支随路由自动展开（合并语义：无变化时返回原引用，React 跳过重渲染）。
  useEffect(() => {
    setOpenIds((prev) => mergeActiveAncestors(prev, items, pathname));
  }, [items, pathname]);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavNode
          key={item.id}
          item={item}
          pathname={pathname}
          openIds={openIds}
          onToggle={toggle}
          onNavigate={onNavigate}
        />
      ))}
    </ul>
  );
}

function NavNode({
  item,
  pathname,
  openIds,
  onToggle,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  openIds: Set<string>;
  onToggle: (id: string) => void;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  const open = openIds.has(item.id);

  // 图标位：有图标渲染图标，无图标留等宽占位，保证各级 label 纵向对齐。
  const iconSlot = Icon ? (
    <Icon className="size-4 shrink-0" />
  ) : (
    <span className="size-4 shrink-0" aria-hidden />
  );

  // 叶子：语义链接 + 激活态柔和底色（不抢 Rail 的主题色眼）。
  if (!hasChildren) {
    const active = item.href ? isPathActive(pathname, item.href) : false;
    return (
      <li>
        <Link
          href={item.href ?? "#"}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md px-2 text-[12px] transition-colors",
            active
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
          )}
        >
          {iconSlot}
          <span className="min-w-0 truncate">{item.label}</span>
        </Link>
      </li>
    );
  }

  // 组：可展开按钮 + chevron（展开时旋转）；含激活后代时标题加重。
  // 展开后子树包一层带左侧引导线的 <ul>，整体右移一级，形成清晰的层级缩进。
  const activeBranch = containsActive(item, pathname);
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-expanded={open}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md px-2 text-[12px] transition-colors",
          activeBranch
            ? "font-medium text-sidebar-foreground"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
        )}
      >
        {iconSlot}
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
      </button>
      {open ? (
        <ul className="mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/50 pl-2 ml-4">
          {item.children?.map((child) => (
            <NavNode
              key={child.id}
              item={child}
              pathname={pathname}
              openIds={openIds}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** 子树含激活路径的所有组 id（即应默认展开的分支）。 */
function activeGroupIds(items: NavItem[], pathname: string): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: NavItem[]) => {
    for (const node of nodes) {
      if (node.children?.length && containsActive(node, pathname)) {
        ids.add(node.id);
        walk(node.children);
      }
    }
  };
  walk(items);
  return ids;
}

/** 把激活祖先合并进现有展开集合（只增不减；无新增时返回原引用以跳过重渲染）。 */
function mergeActiveAncestors(prev: Set<string>, items: NavItem[], pathname: string): Set<string> {
  const active = activeGroupIds(items, pathname);
  let changed = false;
  const next = new Set(prev);
  for (const id of active) {
    if (!next.has(id)) {
      next.add(id);
      changed = true;
    }
  }
  return changed ? next : prev;
}
