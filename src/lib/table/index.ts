/**
 * 表格通用封装出口。TanStack Table + 自封 DataTable（排序/筛选/分页/列显隐/骨架/空态/工具栏）。
 * URL 即状态（page/pageSize/q/sort），server/client 模式由是否传 total 决定。§9 / §6.3
 *
 * 典型用法（服务端模式）：
 *   const { table, params } = useDataTable({ columns, data, total });
 *   <DataTableToolbar table={table} search={params.search} onSearchChange={params.setSearch} actions={<NewButton/>} />
 *   <DataTable table={table} isLoading={isLoading} filtered={!!params.search} />
 *   <DataTablePagination table={table} />
 */
export { DataTable } from "./data-table";
export { DataTableColumnHeader } from "./data-table-column-header";
export { DataTablePagination } from "./data-table-pagination";
export { DataTableToolbar } from "./data-table-toolbar";
export { DataTableViewOptions } from "./data-table-view-options";
export { useDataTable } from "./use-data-table";
export { useDataTableParams } from "./use-data-table-params";
export {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  TABLE_PARAMS,
  parseTableParams,
  parseSortParam,
  stringifySortParam,
} from "./params";
