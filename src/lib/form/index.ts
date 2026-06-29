/**
 * 表单通用封装出口。RHF + Zod(v4) 的声明式 FormField 体系（components/ui/form）
 * + useZodForm（schema 为单一事实源）。§8
 *
 * 用法：
 *   const form = useZodForm(projectSchema, { defaultValues });
 *   <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}>…</form></Form>
 */
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
export { useZodForm } from "./use-zod-form";
