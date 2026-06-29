import { projectSchema } from "@/features/projects/schemas";
import type { Project } from "@/features/projects/types";

/**
 * 开发期内存库（mock 后端）。
 * ⚠️ 进程重启即重置；接真实后端时，删除整个 app/api/ 与本文件即可，前端零改动。
 * 同源 /api 由 lib/api/client.ts 在未设 NEXT_PUBLIC_API_BASE_URL 时命中。
 */

type FieldError = { field: string; message: string };
export type CreateResult = { ok: true; project: Project } | { ok: false; details: FieldError[] };
export type UpdateResult =
  | { ok: true; project: Project | null }
  | { ok: false; details: FieldError[] };

export type ListQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortId?: string;
  sortDesc?: boolean;
};

export type Page<T> = { items: T[]; total: number };

const patchSchema = projectSchema.partial();

let store: Project[] = seed();
let counter = store.length;

function seed(): Project[] {
  const names = [
    "官网改版",
    "支付网关",
    "用户增长实验",
    "数据看板",
    "移动端适配",
    "SSO 接入",
    "邮件推送",
    "审计日志",
    "性能优化",
    "A/B 测试平台",
    "客服工作台",
    "开放 API",
  ];
  const statuses: Project["status"][] = ["active", "archived"];
  const now = Date.now();
  return names.map((name, index) => ({
    id: `p-${(index + 1).toString().padStart(3, "0")}`,
    name,
    status: statuses[index % 3 === 0 ? 1 : 0] ?? "active",
    createdAt: new Date(now - index * 86_400_000).toISOString(),
  }));
}

function nextId(): string {
  counter += 1;
  return `p-${counter.toString().padStart(3, "0")}`;
}

function fieldErrors(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): FieldError[] {
  return error.issues.map((issue) => ({
    field: String(issue.path[0] ?? ""),
    message: issue.message,
  }));
}

export function listProjects(query: ListQuery): Page<Project> {
  let rows = [...store];
  if (query.search) {
    const needle = query.search.toLowerCase();
    rows = rows.filter((row) => row.name.toLowerCase().includes(needle));
  }
  if (query.sortId) {
    rows.sort((a, b) => {
      const av = a[query.sortId as keyof Project];
      const bv = b[query.sortId as keyof Project];
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av > bv) - Number(av < bv);
      return query.sortDesc ? -cmp : cmp;
    });
  }
  const total = rows.length;
  const start = (query.page - 1) * query.pageSize;
  return { items: rows.slice(start, start + query.pageSize), total };
}

export function getProject(id: string): Project | null {
  return store.find((row) => row.id === id) ?? null;
}

export function createProject(input: unknown): CreateResult {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, details: fieldErrors(parsed.error) };
  }
  const project: Project = {
    id: nextId(),
    name: parsed.data.name,
    status: parsed.data.status,
    createdAt: new Date().toISOString(),
  };
  store = [project, ...store];
  return { ok: true, project };
}

export function updateProject(id: string, patch: unknown): UpdateResult {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, details: fieldErrors(parsed.error) };
  }
  const index = store.findIndex((row) => row.id === id);
  if (index === -1) return { ok: true, project: null };
  const updated: Project = { ...store[index], ...parsed.data } as Project;
  store[index] = updated;
  return { ok: true, project: updated };
}

export function deleteProject(id: string): boolean {
  const before = store.length;
  store = store.filter((row) => row.id !== id);
  return store.length < before;
}
