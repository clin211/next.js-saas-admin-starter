"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PAGE_SIZE_OPTIONS } from "./params";

type Ellipsis = "ellipsis-start" | "ellipsis-end";
type PageItem = number | Ellipsis;

function isEllipsis(item: PageItem): item is Ellipsis {
  return item === "ellipsis-start" || item === "ellipsis-end";
}

/**
 * 生成分页页码序列：始终保留首尾，当前页两侧保留兄弟页，其余以省略号收敛。
 * 例：current=5,total=10 → [1, …, 4, 5, 6, …, 10]；总页数较少时全部展开。
 */
function getPageItems(current: number, total: number, siblings = 1): PageItem[] {
  if (total <= 1) return total === 1 ? [1] : [];
  const items: PageItem[] = [];
  const visible = siblings * 2 + 5; // 首 + 尾 + 当前 + 两个省略号位 + 两侧兄弟
  if (total <= visible) {
    for (let page = 1; page <= total; page += 1) items.push(page);
    return items;
  }
  const left = Math.max(current - siblings, 2);
  const right = Math.min(current + siblings, total - 1);
  items.push(1);
  if (left > 2) items.push("ellipsis-start");
  for (let page = left; page <= right; page += 1) items.push(page);
  if (right < total - 1) items.push("ellipsis-end");
  items.push(total);
  return items;
}

/** 分页条：计数 + 每页大小 + 数字页码（1 2 … n-1 n）+ 前后翻页。 */
export function DataTablePagination<TData>({
  table,
  className,
}: {
  table: Table<TData>;
  className?: string;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getRowCount();
  const pageCount = table.getPageCount();
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 px-1 py-3 text-small text-muted-foreground",
        className,
      )}
    >
      {/* 计数紧贴「每页」控件前，单行布局（不再两列分散） */}
      <span className="tabular-nums text-[14px]">
        {from}–{to} / 共 {total} 条
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            每页 {pageSize}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <DropdownMenuItem
              key={size}
              onSelect={(event) => {
                event.preventDefault();
                table.setPageSize(size);
              }}
              className="gap-2 text-[14px]"
            >
              <span className="flex size-4 items-center justify-center">
                {pageSize === size ? <Check className="size-3.5" /> : null}
              </span>
              {size} / 页
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="上一页"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {getPageItems(pageIndex + 1, pageCount).map((item) =>
          isEllipsis(item) ? (
            <span key={item} className="px-1 text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === pageIndex + 1 ? "default" : "outline"}
              size="icon-sm"
              onClick={() => table.setPageIndex(item - 1)}
              aria-current={item === pageIndex + 1 ? "page" : undefined}
              aria-label={`第 ${item} 页`}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="下一页"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
