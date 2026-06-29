"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";

import { cn } from "@/lib/utils";

/** 可排序列头：单击在 升→降→取消 间循环，附方向图标。不可排序列回退为纯文本。 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <span className={cn("text-small font-medium", className)}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1 text-small font-medium transition-colors",
        sorted ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label={`按 ${title} 排序`}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 opacity-60" />
      )}
    </button>
  );
}
