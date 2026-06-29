import {
  CircleAlert,
  Construction,
  FileQuestion,
  FolderKanban,
  LayoutDashboard,
  Lock,
  MessageSquareText,
  ScrollText,
  ServerCrash,
  Settings,
  ShieldCheck,
  ShieldX,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  /** Rail / 组 / 叶子均可带图标；省略时以缩进与 chevron 表达层级。 */
  icon?: LucideIcon;
  /** 叶子的导航地址。组通常省略（仅展开/收起）；若设置则组头本身也可点。 */
  href?: string;
  /** 权限过滤在此层做（无权限则不渲染）。后端仍做最终校验。§10.2 */
  permission?: string;
  /** 有 children 即「组」：Panel 中渲染为可展开/收起的子树，支持任意层级。 */
  children?: NavItem[];
};

/**
 * 顶层 = Rail（一级菜单）；其 children 即 Panel 内的二..N 级树。
 * 结构直接对应 AppShell UI：Rail 取顶层图标，Panel 取激活项的递归子树。§4.4
 */
export const nav: NavItem[] = [
  {
    id: "workbench",
    label: "工作台",
    icon: LayoutDashboard,
    children: [
      { id: "dashboard", label: "仪表盘", icon: LayoutDashboard, href: "/dashboard" },
      { id: "projects", label: "项目", icon: FolderKanban, href: "/projects" },
      {
        id: "access",
        label: "访问控制",
        icon: ShieldCheck,
        children: [
          { id: "users", label: "用户管理", icon: Users, href: "/users", permission: "user:read" },
          {
            id: "roles",
            label: "角色权限",
            icon: ShieldCheck,
            href: "/roles",
            permission: "role:read",
          },
        ],
      },
      {
        id: "content",
        label: "内容管理",
        icon: MessageSquareText,
        children: [
          { id: "prompts", label: "提示词管理", icon: MessageSquareText, href: "/prompts" },
          {
            id: "audit-group",
            label: "审计",
            icon: ScrollText,
            children: [
              {
                id: "audit",
                label: "审计日志",
                icon: ScrollText,
                href: "/audit",
                permission: "audit:read",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "设置",
    icon: Settings,
    children: [{ id: "workspace", label: "工作区", icon: Settings, href: "/settings/workspace" }],
  },
  {
    id: "system",
    label: "错误页",
    icon: CircleAlert,
    children: [
      { id: "error-index", label: "总览", icon: CircleAlert, href: "/error" },
      { id: "error-404", label: "404 未找到", icon: FileQuestion, href: "/error/404" },
      { id: "error-401", label: "401 未授权", icon: ShieldX, href: "/error/401" },
      { id: "error-403", label: "403 禁止访问", icon: Lock, href: "/error/403" },
      { id: "error-500", label: "500 服务器错误", icon: ServerCrash, href: "/error/500" },
      { id: "error-503", label: "503 服务不可用", icon: Construction, href: "/error/503" },
    ],
  },
];

/** 当前路径是否激活给定 href（精确或前缀）。首页 "/" 仅精确匹配。 */
export function isPathActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 某节点（含子树）是否与当前路径激活：叶子看 href，组看任意后代。 */
export function containsActive(item: NavItem, pathname: string): boolean {
  if (item.href && isPathActive(pathname, item.href)) return true;
  return (item.children ?? []).some((child) => containsActive(child, pathname));
}

/** 深度优先取首个叶子的 href（Rail 项点击目标；无后代叶子时回退自身 href）。 */
export function firstLeafHref(item: NavItem): string | undefined {
  for (const child of item.children ?? []) {
    const leaf = firstLeafHref(child);
    if (leaf) return leaf;
  }
  return item.href;
}

/** 扁平化所有叶子（href 存在且无 children），供命令面板搜索。 */
export function flattenLeaves(items: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  const walk = (nodes: NavItem[]) => {
    for (const node of nodes) {
      if (node.children?.length) walk(node.children);
      else if (node.href) result.push(node);
    }
  };
  walk(items);
  return result;
}

/** 找子树包含激活路径的顶层项（Rail 高亮 + Panel 取其 children）；无匹配回退首项。 */
export function findActiveTop(items: NavItem[], pathname: string): NavItem | undefined {
  return items.find((item) => containsActive(item, pathname)) ?? items[0];
}

/**
 * 回溯当前路径在 nav 树中的轨迹（顶层模块 → … → 激活叶子），供面包屑使用。
 * 沿激活节点逐层下钻，返回从根到叶子的完整链路；无匹配返回空数组。
 */
export function findTrail(items: NavItem[], pathname: string): NavItem[] {
  const walk = (nodes: NavItem[], acc: NavItem[]): NavItem[] | undefined => {
    for (const node of nodes) {
      const trail = [...acc, node];
      if (node.href && isPathActive(pathname, node.href)) return trail;
      if (node.children?.length) {
        const found = walk(node.children, trail);
        if (found) return found;
      }
    }
    return undefined;
  };
  return walk(items, []) ?? [];
}

/**
 * 递归权限过滤：叶子按 canSee 判定；组在「无可见子项」时整体裁掉。
 * canSee 仅对叶子调用，返回其是否可见（组自身可见性由后代决定）。
 */
export function filterVisible(items: NavItem[], canSee: (item: NavItem) => boolean): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      const kids = filterVisible(item.children, canSee);
      if (kids.length) result.push({ ...item, children: kids });
    } else if (canSee(item)) {
      result.push(item);
    }
  }
  return result;
}
