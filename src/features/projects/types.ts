export type ProjectStatus = "active" | "archived";

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
};

/** 列表查询参数（与 lib/table 的 URL 约定对齐）。 */
export type ProjectListQuery = {
  page: number;
  pageSize: number;
  search: string;
  /** 排序字符串，格式 `id.dir`（如 `name.asc`）。 */
  sort: string;
};

/** 分页响应。 */
export type Page<T> = {
  items: T[];
  total: number;
};
