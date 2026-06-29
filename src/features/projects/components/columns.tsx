"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTableColumnHeader } from "@/lib/table";
import { cn } from "@/lib/utils";

import { PROJECT_STATUS_LABELS } from "../constants";
import { useDeleteProject, useUpdateProject } from "../hooks/use-projects";
import type { Project } from "../types";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 状态徽章：进行中（成功色）/ 已归档（弱化）。 */
function StatusBadge({ status }: { status: Project["status"] }) {
  const active = status === "active";
  return (
    <Badge
      variant="outline"
      className={cn(
        active
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

/** 行操作：非移动端横向展开 icon-only 按钮（tooltip 标注）；移动端收进下拉。 */
function ProjectRowActions({ project }: { project: Project }) {
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const archived = project.status === "archived";
  const toggleLabel = archived ? "激活" : "归档";
  const ToggleIcon = archived ? ArchiveRestore : Archive;

  const toggle = () =>
    updateProject.mutate({
      id: project.id,
      patch: { status: archived ? "active" : "archived" },
    });
  const remove = () => deleteProject.mutate(project.id);

  return (
    <div className="flex items-center justify-end">
      {/* 非移动端：横向展开，仅 icon + tooltip */}
      <div className="hidden items-center gap-0.5 md:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggle}
              disabled={updateProject.isPending}
              aria-label={toggleLabel}
            >
              <ToggleIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{toggleLabel}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={remove}
              disabled={deleteProject.isPending}
              aria-label="删除"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>删除</TooltipContent>
        </Tooltip>
      </div>

      {/* 移动端：收进下拉菜单 */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="更多操作">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onSelect={() => toggle()}>{toggleLabel}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => remove()}
            >
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Projects 列定义（名称/创建时间可排序，状态/操作不可）。 */
export function getProjectColumns(): ColumnDef<Project>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      meta: { title: "名称" },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      enableSorting: false,
      meta: { title: "状态" },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {dateFormatter.format(new Date(row.original.createdAt))}
        </span>
      ),
      meta: { title: "创建时间" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => <ProjectRowActions project={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
