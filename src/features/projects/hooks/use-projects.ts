"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notifySuccess } from "@/lib/toast";

import { projectsApi } from "../api";
import { projectKeys } from "../query-keys";
import type { ProjectInput } from "../schemas";
import type { Project, ProjectListQuery } from "../types";

/** 列表查询（分页/搜索/排序）。keepPreviousData 让翻页不闪空。 */
export function useProjects(query: ProjectListQuery) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: () => projectsApi.list(query),
    placeholderData: keepPreviousData,
  });
}

/** 详情查询。 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });
}

/** 创建：成功失效列表 + Toast。
 *  422 字段错误交由表单就近回填（form.setError）；其余错误由全局 MutationCache.onError 统一 Toast。 */
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
      notifySuccess("项目已创建");
    },
  });
}

/** 更新：失效列表 + 该详情。
 *  错误处理同上：422 交表单，其余交全局 MutationCache。 */
export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ProjectInput> }) =>
      projectsApi.update(id, patch),
    onSuccess: (project: Project) => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
      qc.invalidateQueries({ queryKey: projectKeys.detail(project.id) });
      notifySuccess("已更新");
    },
  });
}

/** 删除：失效列表 + Toast（可选回滚/撤销在此扩展）。
 *  错误处理同上。 */
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() });
      notifySuccess("项目已删除");
    },
  });
}
