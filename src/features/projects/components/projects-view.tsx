"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  useDataTable,
  useDataTableParams,
} from "@/lib/table";

import { getProjectColumns } from "./columns";
import { useProjects } from "../hooks/use-projects";

/**
 * 项目列表视图（客户端）：
 * URL 驱动 page/pageSize/q/sort → useProjects 取数（首屏由 RSC 预取注入）→ DataTable 渲染。
 */
export function ProjectsView() {
  const params = useDataTableParams();
  const query = useMemo(
    () => ({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sort: params.sort,
    }),
    [params.page, params.pageSize, params.search, params.sort],
  );

  const { data, isLoading, isFetching } = useProjects(query);
  const columns = useMemo(() => getProjectColumns(), []);
  const { table } = useDataTable({
    columns,
    data: data?.items ?? [],
    total: data?.total ?? 0,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        search={params.search}
        onSearchChange={params.setSearch}
        actions={
          <Button asChild size="sm">
            <Link href="/projects/new">
              <Plus className="size-4" />
              新建项目
            </Link>
          </Button>
        }
      />
      {/*
        翻页/搜索切换时：page 是不同 query key，新 key 在数据到达前为 pending 态，
        此时 isLoading 会短暂为 true。若直接用它驱动骨架，会把 keepPreviousData 保留的
        上一屏数据盖掉、再换回，造成「闪动」。故骨架仅在「确实无任何数据」（首屏）时出现；
        翻页时让上一屏数据继续可见，并用 isFetching 给一条顶部进度条作轻量反馈。
      */}
      <DataTable
        table={table}
        isLoading={isLoading && !data}
        isFetching={isFetching}
        filtered={!!params.search}
      />
      <DataTablePagination table={table} />
    </div>
  );
}
