"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import type { SortingState } from "@tanstack/react-table";

import { DEFAULT_PAGE_SIZE, TABLE_PARAMS, parseSortParam, stringifySortParam } from "./params";

/**
 * 客户端表格 URL 状态（与 parseTableParams 同约定）。§6.3
 *
 * 全部 shallow: true —— 翻页/每页大小/搜索/排序仅在前端更新 URL，**不触发 RSC 导航**：
 *   - 首屏（及深链刷新）由 RSC 页面用 parseTableParams 预取注入；
 *   - 后续切换交客户端 useProjects 取数（keepPreviousData 保留上一屏 + isFetching 进度条）。
 * 以此避免每次翻页的服务端往返与 hydration 时序造成的闪动。
 */
export function useDataTableParams() {
  const [values, setParams] = useQueryStates({
    [TABLE_PARAMS.page]: parseAsInteger.withDefault(1).withOptions({ shallow: true }),
    [TABLE_PARAMS.pageSize]: parseAsInteger
      .withDefault(DEFAULT_PAGE_SIZE)
      .withOptions({ shallow: true }),
    [TABLE_PARAMS.search]: parseAsString.withDefault("").withOptions({ shallow: true }),
    [TABLE_PARAMS.sort]: parseAsString.withDefault("").withOptions({ shallow: true }),
  });

  const sortingState = parseSortParam(values[TABLE_PARAMS.sort]);

  return {
    page: values[TABLE_PARAMS.page],
    pageSize: values[TABLE_PARAMS.pageSize],
    search: values[TABLE_PARAMS.search],
    sort: values[TABLE_PARAMS.sort],
    sortingState,
    setPage: (page: number) => setParams({ [TABLE_PARAMS.page]: page }),
    setPageSize: (pageSize: number) =>
      setParams({ [TABLE_PARAMS.pageSize]: pageSize, [TABLE_PARAMS.page]: 1 }),
    setSearch: (search: string) =>
      setParams({ [TABLE_PARAMS.search]: search, [TABLE_PARAMS.page]: 1 }),
    setSortingState: (state: SortingState) =>
      setParams({ [TABLE_PARAMS.sort]: stringifySortParam(state), [TABLE_PARAMS.page]: 1 }),
    setPagination: (page: number, pageSize: number) =>
      setParams({ [TABLE_PARAMS.page]: page, [TABLE_PARAMS.pageSize]: pageSize }),
  };
}
