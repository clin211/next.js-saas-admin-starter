"use client";

import { Check, Columns3 } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** 列显隐菜单：勾选即显隐列（用 Check 图标替代 Checkbox 依赖）。 */
export function DataTableViewOptions<TData>({ table }: { table: Table<TData> }) {
  const hideable = table.getAllLeafColumns().filter((column) => column.getCanHide());

  if (!hideable.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Columns3 className="size-4" />
          <span className="hidden sm:inline">显示列</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>显示列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideable.map((column) => {
          const title = column.columnDef.meta?.title ?? column.id;
          return (
            <DropdownMenuItem
              key={column.id}
              onSelect={(event) => {
                event.preventDefault();
                column.toggleVisibility();
              }}
              className="gap-2 capitalize"
            >
              <span className="flex size-4 items-center justify-center">
                {column.getIsVisible() ? <Check className="size-3.5" /> : null}
              </span>
              {title}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
