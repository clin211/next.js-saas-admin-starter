"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

/**
 * 表格工具栏：搜索（防抖 400ms 写回 URL，避免逐键触发服务端重取）+ 自定义过滤/操作 + 列显隐。
 */
export function DataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  children,
  actions,
}: {
  table: Table<TData>;
  search?: string;
  onSearchChange?: (value: string) => void;
  /** 过滤器插槽。 */
  children?: ReactNode;
  /** 右侧操作插槽（如「新建」按钮）。 */
  actions?: ReactNode;
}) {
  const [value, setValue] = useState(search ?? "");
  const isFirst = useRef(true);
  const handlerRef = useRef(onSearchChange);

  useEffect(() => {
    handlerRef.current = onSearchChange;
  });
  useEffect(() => {
    setValue(search ?? "");
  }, [search]);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const timer = setTimeout(() => handlerRef.current?.(value), 400);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSearchChange ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="搜索…"
            className="h-9 w-full pl-8 sm:w-64"
            aria-label="搜索"
          />
        </div>
      ) : null}
      {children}
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
