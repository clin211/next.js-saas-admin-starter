import { z } from "zod";

/** Zod schema 为单一事实源：驱动 RHF 校验 + 复用为接口校验。§8 / §7.3 */
export const projectSchema = z.object({
  name: z.string().trim().min(1, "请输入项目名称").max(100, "名称不超过 100 个字符"),
  status: z.enum(["active", "archived"]).default("active"),
});

/** 创建/编辑输入（接口 + 表单共用）。 */
export type ProjectInput = z.infer<typeof projectSchema>;
/** 表单值类型（供 useZodForm 显式声明）。 */
export type ProjectFormValues = ProjectInput;
