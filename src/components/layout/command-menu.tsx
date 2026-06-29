"use client";

import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { flattenLeaves, nav } from "@/config/nav";

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 全局 ⌘K 命令面板：快捷导航 + 动作。§10.6 */
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();

  const run = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="输入命令或搜索…" />
      <CommandList>
        <CommandEmpty>无匹配结果</CommandEmpty>
        <CommandGroup heading="导航">
          {flattenLeaves(nav).map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.href ?? ""}`}
                onSelect={() => run(item.href ?? "/")}
              >
                {Icon ? <Icon className="size-4" /> : null}
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
