"use client";

import { usePathname } from "next/navigation";

import { NavTree } from "@/components/layout/nav-tree";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { filterVisible, nav } from "@/config/nav";
import { hasPermission, type Permission } from "@/config/permissions";
import { siteConfig } from "@/config/site";
import { useSession } from "@/lib/auth/session-provider";

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 移动端（<md）：整棵导航树收进单个抽屉，由 Topbar 汉堡触发；点叶子即关。§4.4 / §4.5 */
export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const session = useSession();
  // 权限过滤与 Panel 同源：递归裁掉无权限叶子。§10.2
  const items = filterVisible(nav, (item) =>
    !item.permission
      ? true
      : session
        ? hasPermission(session.role, item.permission as Permission)
        : false,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 bg-sidebar p-0">
        {/* 抽屉头部：品牌方标 + 站点名，与 Rail / 登录页统一；收窄字号避免压过下方菜单 */}
        <SheetHeader className="px-4 py-3">
          <SheetTitle className="flex items-center gap-2.5 text-sidebar-foreground">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
              }}
            >
              SA
            </span>
            <span className="text-body font-semibold tracking-tight">{siteConfig.name}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-2 pb-4">
          <NavTree items={items} pathname={pathname} onNavigate={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
