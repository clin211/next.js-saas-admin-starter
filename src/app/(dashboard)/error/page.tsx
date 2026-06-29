import type { ComponentType } from "react";
import {
  Construction,
  FileQuestion,
  Lock,
  ServerCrash,
  ShieldX,
  type LucideProps,
} from "lucide-react";
import Link from "next/link";

import { type ErrorTone, errorToneBadge } from "@/components/blocks/error-scene";
import { PageHeader } from "@/components/blocks/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorCard = {
  code: string;
  title: string;
  href: string;
  icon: ComponentType<LucideProps>;
  tone: ErrorTone;
};

/** 错误态预览集：404 / 401 / 403 / 5xx 各一张卡片，点「预览」进入全屏场景。 */
const ERRORS: ErrorCard[] = [
  { code: "404", title: "页面未找到", href: "/error/404", icon: FileQuestion, tone: "muted" },
  { code: "401", title: "未授权", href: "/error/401", icon: ShieldX, tone: "warning" },
  { code: "403", title: "禁止访问", href: "/error/403", icon: Lock, tone: "warning" },
  { code: "500", title: "服务器错误", href: "/error/500", icon: ServerCrash, tone: "destructive" },
  { code: "503", title: "服务不可用", href: "/error/503", icon: Construction, tone: "destructive" },
];

export const metadata = { title: "错误页面" };

export default function ErrorIndexPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="错误页面" description="404 / 401 / 403 / 5xx 错误态预览" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ERRORS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.code}
              className="flex items-start gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  errorToneBadge(item.tone),
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div>
                  <p className="text-h3 font-semibold tracking-tight">{item.code}</p>
                  <p className="text-small text-muted-foreground">{item.title}</p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={item.href}>预览</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
