import { apiClient } from "@/lib/api/client";

import type { ProjectInput } from "./schemas";
import type { Page, Project, ProjectListQuery } from "./types";

/**
 * Projects 请求层。路径相对（/projects），由 apiClient 在无 baseURL 时命中同源 /api mock。
 * 接真实后端：设 NEXT_PUBLIC_API_BASE_URL 即整体切换。
 */
export const projectsApi = {
  list: (query: ProjectListQuery) =>
    apiClient.get<Page<Project>>("/projects", {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        q: query.search,
        sort: query.sort,
      },
    }),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
  create: (input: ProjectInput) => apiClient.post<Project>("/projects", input),
  update: (id: string, patch: Partial<ProjectInput>) =>
    apiClient.patch<Project>(`/projects/${id}`, patch),
  remove: (id: string) => apiClient.delete<void>(`/projects/${id}`),
};
