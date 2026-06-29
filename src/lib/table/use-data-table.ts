"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type Table,
} from "@tanstack/react-table";

import { useDataTableParams } from "./use-data-table-params";

/**
 * 声明式表格实例工厂（server/client 自切换）。
 * - 传 `total` → 服务端模式：分页/排序/筛选交服务端（RSC 预取 + nuqs 驱动）。
 * - 省略 `total` → 客户端模式：表格自带排序/筛选/分页。
 * URL 即状态（page/pageSize/q/sort），刷新可保留、可分享。§6.3 / §9
 */
export function useDataTable<TData>(opts: {
  columns: ColumnDef<TData>[];
  data: TData[];
  /** 总条数；传入即启用服务端模式。 */
  total?: number;
}) {
  const params = useDataTableParams();
  const { columns, data, total } = opts;
  const serverMode = total !== undefined;

  const pagination: PaginationState = {
    pageIndex: Math.max(0, params.page - 1),
    pageSize: params.pageSize,
  };

  const table: Table<TData> = useReactTable<TData>({
    data,
    columns,
    state: { sorting: params.sortingState, pagination },
    manualPagination: serverMode,
    manualSorting: serverMode,
    manualFiltering: serverMode,
    enableRowSelection: true,
    pageCount: serverMode ? Math.max(1, Math.ceil(total / params.pageSize)) : undefined,
    rowCount: total,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? (updater as (s: PaginationState) => PaginationState)(pagination)
          : updater;
      params.setPagination(next.pageIndex + 1, next.pageSize);
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function"
          ? (updater as (s: SortingState) => SortingState)(params.sortingState)
          : updater;
      params.setSortingState(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: serverMode ? undefined : getFilteredRowModel(),
    getSortedRowModel: serverMode ? undefined : getSortedRowModel(),
    getPaginationRowModel: serverMode ? undefined : getPaginationRowModel(),
  });

  return { table, params };
}
