"use client";

import { flexRender, type Table } from "@tanstack/react-table";
import { Inbox, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  table: Table<TData>;
  isLoading?: boolean;
  /** 后台取数中（翻页/搜索切换）。不替换行，仅在表格顶部给一条轻量进度条作反馈。 */
  isFetching?: boolean;
  /** 加载时渲染的骨架行数，默认按当前页大小。 */
  skeletonRows?: number;
  /** 空态：是否因搜索/筛选无结果（影响文案）。 */
  filtered?: boolean;
  /** 空态自定义内容。 */
  emptyState?: ReactNode;
  onRowClick?: (row: TData) => void;
  className?: string;
};

/**
 * 通用数据表格（纯展示）。状态/数据/分页/排序由传入的 table 实例决定，
 * 故 server/client 两种模式通用。配 <DataTableToolbar> + <DataTablePagination>。§9
 */
export function DataTable<TData>({
  table,
  isLoading,
  isFetching,
  skeletonRows,
  filtered,
  emptyState,
  onRowClick,
  className,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const colCount = table.getVisibleLeafColumns().length;
  const skeletonCount = skeletonRows ?? table.getState().pagination.pageSize ?? 6;

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border border-border bg-card", className)}
    >
      {/* 后台取数反馈：不替换行，仅在顶部给一条脉冲进度条（与骨架互斥）。 */}
      {isFetching && !isLoading ? (
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary" />
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-small">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-10 px-3 text-left align-middle font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: Math.min(skeletonCount, 20) }).map((_, rowIndex) => (
                // 骨架行为占位行、无数据身份，按索引为 key 安全（不会重排）。
                // eslint-disable-next-line react/no-array-index-key
                <tr key={`skeleton-${rowIndex}`} className="border-b border-border">
                  {Array.from({ length: colCount }).map((__, cellIndex) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <td key={`skeleton-${rowIndex}-${cellIndex}`} className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-[12rem]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="p-0">
                  {emptyState ?? <TableEmpty filtered={!!filtered} />}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    "border-b border-border transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/40",
                    row.getIsSelected() && "bg-primary/5",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2.5 align-middle",
                        cell.column.columnDef.meta?.cellClassName,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableEmpty({ filtered }: { filtered: boolean }) {
  const Icon = filtered ? SearchX : Inbox;
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-muted-foreground">
      <Icon className="size-7 text-muted-foreground/60" />
      <p className="text-small font-medium text-foreground">
        {filtered ? "没有匹配的结果" : "暂无数据"}
      </p>
      <p className="text-caption">{filtered ? "试试调整搜索或筛选条件" : "数据将在此处展示"}</p>
    </div>
  );
}
