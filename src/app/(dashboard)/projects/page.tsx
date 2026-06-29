import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PageHeader } from "@/components/blocks/page-header";
import { projectsApi } from "@/features/projects/api";
import { ProjectsView } from "@/features/projects/components/projects-view";
import { projectKeys } from "@/features/projects/query-keys";
import { getQueryClient } from "@/lib/api/query-client";
import { requireSession } from "@/lib/auth/session";
import { parseTableParams } from "@/lib/table";

export const metadata = { title: "项目管理" };

/**
 * 项目列表（RSC）：解析 URL → prefetchQuery → HydrateBoundary 注入 →
 * 客户端 ProjectsView 接管（翻页/搜索/排序走 nuqs，不再二次首屏请求）。§3.1 / §6.2
 */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 仅作登录守卫：无会话即跳登录（租户作用域移除后不再消费返回值）。§3.3
  await requireSession();
  const sp = await searchParams;
  const parsed = parseTableParams(sp);
  const query = {
    page: parsed.page,
    pageSize: parsed.pageSize,
    search: parsed.search,
    sort: parsed.sort,
  };

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: projectKeys.list(query),
    queryFn: () => projectsApi.list(query),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="项目管理" description="创建、归档与维护项目" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectsView />
      </HydrationBoundary>
    </div>
  );
}
