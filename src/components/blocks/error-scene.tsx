import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

/** 错误场景色调：仅消费语义令牌（禁止写死 hex）。 */
export type ErrorTone = "default" | "muted" | "warning" | "destructive";

const TONE: Record<ErrorTone, { badge: string; fg: string }> = {
  default: { badge: "bg-primary/10", fg: "text-primary" },
  muted: { badge: "bg-muted", fg: "text-muted-foreground" },
  warning: { badge: "bg-warning/10", fg: "text-warning" },
  destructive: { badge: "bg-destructive/10", fg: "text-destructive" },
};

/** 色调徽标类（背景 + 前景），供 ErrorScene 与画廊卡片共用，避免色调定义漂移。 */
export function errorToneBadge(tone: ErrorTone): string {
  return `${TONE[tone].badge} ${TONE[tone].fg}`;
}

/**
 * 统一错误展示场景。两种视觉模式：
 *   - 插画模式（传 illustration）：undraw 英雄图 + 小号 code 眉标 + 标题/描述/操作。
 *   - 图标模式（传 icon，无 illustration）：色调徽标 + 大号 code（text-display）。
 * 纯标记、零 hook —— 故可安全用于 global-error.tsx（该处无 providers 上下文）。
 * 默认高度适配 AppShell 内 main 区；根级真实边界用 className 覆盖为 min-h-svh。§4.7 / §12.1
 */
export function ErrorScene({
  code,
  title,
  description,
  icon: Icon,
  illustration,
  actions,
  tone = "default",
  className,
}: {
  code?: string;
  title: string;
  description?: string;
  icon?: ComponentType<LucideProps>;
  illustration?: ReactNode;
  actions?: ReactNode;
  tone?: ErrorTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100svh-8rem)] flex-col items-center justify-center gap-6 px-6 py-12 text-center",
        className,
      )}
    >
      {illustration ? (
        <div className="flex justify-center">{illustration}</div>
      ) : Icon ? (
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl",
            errorToneBadge(tone),
          )}
        >
          <Icon className="size-7" />
        </div>
      ) : null}

      {code ? (
        illustration ? (
          <p className="text-overline text-muted-foreground uppercase">Error · {code}</p>
        ) : (
          <p className={cn("text-display font-semibold tracking-tight", TONE[tone].fg)}>{code}</p>
        )
      ) : null}

      <div className="space-y-2">
        <h1 className="text-h2 font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-md text-body text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}
