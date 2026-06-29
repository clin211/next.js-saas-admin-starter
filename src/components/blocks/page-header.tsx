import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * 统一的页面头部：标题 + 描述 + 操作区。保证每个页面顶部一致。§4.4
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-h2 font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-small text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
