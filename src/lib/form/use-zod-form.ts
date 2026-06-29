"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from "react-hook-form";
import type { z } from "zod";

/**
 * 以 Zod schema 为单一事实源创建 RHF 实例。
 * - 校验模式 onTouched：失焦后开始 onChange 校验，提交时全量校验（§8.2）。
 * - 类型注：zod `.default()` 会使 schema 的 Input≠Output，与 RHF 的单值类型有摩擦，
 *   故这里以调用方显式声明的 TFieldValues 为准，resolver 内部类型收敛为此。
 *
 * 用法：`useZodForm<ProjectFormValues>(projectSchema, { defaultValues })`
 */
export function useZodForm<TFieldValues extends FieldValues>(
  schema: z.ZodType,
  options?: Omit<UseFormProps<TFieldValues>, "resolver"> & {
    defaultValues?: DefaultValues<TFieldValues>;
  },
) {
  return useForm<TFieldValues>({
    // zod v4 schema 的 Input≠Output（含 .default()），与 resolver 的类型存在摩擦，
    // 这里收敛为调用方声明的 TFieldValues。
    resolver: zodResolver(schema as never) as Resolver<TFieldValues>,
    mode: "onTouched",
    ...options,
  });
}
