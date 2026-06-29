import type { SortingState } from "@tanstack/react-table";

/**
 * 表格 URL 参数约定（服务端 prefetch 与客户端 nuqs 共用，保证刷新/分享/前进后退一致）。§6.3 / §9
 */
export const TABLE_PARAMS = {
  page: "page",
  pageSize: "pageSize",
  search: "q",
  sort: "sort",
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** sort 参数格式：`id.asc` / `id.desc`，多列用逗号分隔；空串=不排序。 */
export function parseSortParam(raw: string | undefined): SortingState {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const [id, dir] = part.split(".");
      return { id: id ?? "", desc: dir === "desc" };
    })
    .filter((item) => item.id);
}

export function stringifySortParam(state: SortingState): string {
  if (!state.length) return "";
  return state.map((item) => `${item.id}.${item.desc ? "desc" : "asc"}`).join(",");
}

function toInt(
  value: string | string[] | undefined,
  fallback: number,
  min: number,
  max?: number,
): number {
  if (Array.isArray(value)) value = value[0];
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.max(min, Math.floor(parsed));
  return max ? Math.min(max, clamped) : clamped;
}

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** 服务端用：从 Next searchParams 解析出表格状态（与客户端 useDataTableParams 同约定）。 */
export function parseTableParams(searchParams: Record<string, string | string[] | undefined>) {
  const page = toInt(searchParams[TABLE_PARAMS.page], 1, 1);
  const pageSize = toInt(searchParams[TABLE_PARAMS.pageSize], DEFAULT_PAGE_SIZE, 1, 100);
  const search = asString(searchParams[TABLE_PARAMS.search]);
  const sortRaw = asString(searchParams[TABLE_PARAMS.sort]);
  return {
    page,
    pageSize,
    search,
    sort: sortRaw,
    sortingState: parseSortParam(sortRaw),
  };
}

/** TanStack Table 列元数据增强（标题/单元格 className）。 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** 列标题（用于列显隐菜单、无 header 函数时的兜底）。 */
    title?: string;
    /** 单元格额外 className。 */
    cellClassName?: string;
  }
}
