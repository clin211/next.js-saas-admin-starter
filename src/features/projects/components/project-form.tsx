"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValidationError } from "@/lib/api/errors";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@/lib/form";

import { useCreateProject } from "../hooks/use-projects";
import { projectSchema, type ProjectFormValues } from "../schemas";
import { PROJECT_STATUS_LABELS } from "../constants";

/**
 * 新建项目表单：RHF + Zod（onTouched）。
 * - 提交防抖由 mutation 的 isPending + 按钮 disabled 兜底。
 * - 422 → 字段级错误回填（form.setError）。
 * - 其他错误 → 由全局 MutationCache.onError 统一 Toast，此处直接吞掉 rejection 避免双 Toast。
 */
export function ProjectForm() {
  const router = useRouter();
  const createProject = useCreateProject();

  const form = useZodForm<ProjectFormValues>(projectSchema, {
    defaultValues: { name: "", status: "active" },
  });

  async function onSubmit(values: ProjectFormValues) {
    try {
      await createProject.mutateAsync(values);
      router.push("/projects");
    } catch (error) {
      if (error instanceof ValidationError) {
        for (const [field, message] of Object.entries(error.fieldErrors())) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          form.setError(field as any, { message });
        }
        return;
      }
      // 非 422 错误由全局 MutationCache.onError 统一 Toast，此处吞掉以避免双 Toast
      return;
    }
  }

  const submitting = createProject.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>项目名称</FormLabel>
              <FormControl>
                <Input placeholder="如：官网改版" autoComplete="off" {...field} />
              </FormControl>
              <FormDescription>1–100 个字符，用于在工作台识别该项目。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>初始状态</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-small shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {(
                    Object.keys(PROJECT_STATUS_LABELS) as Array<keyof typeof PROJECT_STATUS_LABELS>
                  ).map((value) => (
                    <option key={value} value={value}>
                      {PROJECT_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitting ? "创建中…" : "创建项目"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            取消
          </Button>
        </div>
      </form>
    </Form>
  );
}
