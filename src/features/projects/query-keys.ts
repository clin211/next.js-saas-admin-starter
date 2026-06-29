/**
 * 项目域 Query Key 工厂。§6.2
 *
 * 每个 feature 自带 key 工厂（范本），按「域 → list/detail → 参数」分层，
 * 便于按维度失效（`invalidateQueries({ queryKey: projectKeys.all })` 一键全清）。
 * key 已不再按租户作用域。
 */
import type { ProjectListQuery } from "./types";

export const projectKeys = {
  /** 项目域根：失效所有项目相关 query 时用。 */
  all: ["projects"] as const,
  /** 所有列表 query：失效全部列表（含分页/搜索/排序变体）时用。 */
  lists: () => ["projects", "list"] as const,
  /** 单条列表 query：按查询参数（分页/搜索/排序）作用域。 */
  list: (query: ProjectListQuery) => ["projects", "list", query] as const,
  /** 所有详情 query：失效全部详情时用。 */
  details: () => ["projects", "detail"] as const,
  /** 单条详情 query：按 id 作用域。 */
  detail: (id: string) => ["projects", "detail", id] as const,
};
