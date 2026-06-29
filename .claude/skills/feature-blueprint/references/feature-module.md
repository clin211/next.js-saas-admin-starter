# Feature 模块完整模板（以 `members` 为例）

> 配合 `SKILL.md` 第 2 步使用。**照抄 `features/projects/` 的形态**，把 `members` 换成你的模块名。原则：**删除一个功能 = 删除一个文件夹**，模块必须自包含。

## 目录结构（目标态）

```
features/members/
├── schemas.ts          # Zod 单一事实源
├── types.ts            # TS 类型（z.infer + 列表/详情参数）
├── constants.ts        # 状态标签、列定义、枚举映射
├── api.ts              # membersApi（走 apiClient）
├── hooks/
│   ├── use-members.ts      # 取数 + 变更（TanStack Query）
│   └── use-member-form.ts  # 表单逻辑（RHF + zodResolver）
├── components/
│   ├── members-page.tsx    # 容器：编排
│   ├── members-toolbar.tsx # 展示：搜索/筛选（URL 状态）
│   ├── members-table.tsx   # 展示：表格
│   └── member-form.tsx     # 展示：表单字段
└── index.ts            # barrel 出口
```

下面逐个文件给模板。**先读 `features/projects/*` 对照真实风格**，再按需扩展。

---

## schemas.ts —— 单一事实源

```ts
import { z } from "zod";

/** Zod schema 为单一事实源：驱动 RHF 校验 + 复用为接口校验。§8 / §7.3 */
export const memberSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.email("邮箱格式不正确"),
  role: z.enum(["Console", "member", "viewer"]).default("member"),
});

/** 编辑时部分字段可选（PATCH）。 */
export const memberUpdateSchema = memberSchema.partial();

export type MemberInput = z.infer<typeof memberSchema>;
export type MemberUpdate = z.infer<typeof memberUpdateSchema>;
```

> 为什么类型从 schema 推：改一处约束，表单和接口自动同步，杜绝「前端放行、后端拒绝」。

## types.ts —— 实体与查询参数

```ts
import type { MemberInput } from "./schemas";

export type MemberRole = "Console" | "member" | "viewer";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "active" | "invited" | "disabled";
  createdAt: string;
};

/** 列表查询参数 —— 与 URL 状态一一对应（URL 即状态）。 */
export type MemberListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: MemberRole;
};

export type { MemberInput };
```

## constants.ts —— 展示用的常量映射

```ts
export const MEMBER_ROLE_LABELS = {
  Console: "管理员",
  member: "成员",
  viewer: "只读",
} as const;

export const MEMBER_STATUS_LABELS = {
  active: "正常",
  invited: "已邀请",
  disabled: "已停用",
} as const;

/** 默认分页，与表格/URL 状态共享。 */
export const DEFAULT_PAGE_SIZE = 20;
```

## api.ts —— 走 apiClient

```ts
import { apiClient } from "@/lib/api/client";

import type { MemberInput, MemberUpdate } from "./schemas";
import type { Member, MemberListParams } from "./types";

export const membersApi = {
  list: (params?: MemberListParams) =>
    apiClient.get<Member[]>("/members", { params }),
  get: (id: string) => apiClient.get<Member>(`/members/${id}`),
  create: (input: MemberInput) => apiClient.post<Member>("/members", input),
  update: (id: string, input: MemberUpdate) =>
    apiClient.patch<Member>(`/members/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/members/${id}`),
};
```

> 需要缓存/失效时透传 `next: { tags: [...] }`（见 `rendering-modes.md` 的「缓存缺口」补类型）。

## query-keys.ts —— 在 `qk` 工厂里加一段

```ts
// src/lib/api/query-keys.ts —— 追加（不要重写整个 qk）
export const qk = {
  projects: { /* 既有 */ } as const,
  members: {
    all: ["members"] as const,
    lists: () => [...qk.members.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...qk.members.lists(), params] as const,
    details: () => [...qk.members.all, "detail"] as const,
    detail: (id: string) => [...qk.members.details(), id] as const,
  } as const,
} as const;
```

> 层级 key 让失效有维度：`invalidateQueries({ queryKey: qk.members.lists() })` 清所有列表、留详情缓存。

## hooks/use-members.ts —— 取数 + 变更

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { qk } from "@/lib/api/query-keys";

import { membersApi } from "../api";
import type { MemberInput, MemberUpdate } from "../schemas";
import type { MemberListParams } from "../types";

export function useMembersList(params: MemberListParams) {
  return useQuery({
    queryKey: qk.members.list(params),
    queryFn: () => membersApi.list(params),
    placeholderData: (prev) => prev, // 翻页/搜索时保留旧数据，减跳动
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInput) => membersApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members.lists() });
      toast.success("成员已添加");
    },
    onError: (e) => toast.error("添加失败", { description: (e as Error).message }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MemberUpdate }) =>
      membersApi.update(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: qk.members.lists() });
      qc.invalidateQueries({ queryKey: qk.members.detail(id) });
      toast.success("已保存");
    },
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.members.lists() });
      toast.success("已删除");
    },
  });
}
```

> 注意：表单提交后若页面顶层是 RSC 取数，除了 `invalidateQueries` 还可能要 `router.refresh()`。

## hooks/use-member-form.ts —— 表单逻辑（RHF + zodResolver）

```ts
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"; // 需引入该包

import { memberSchema, type MemberInput } from "../schemas";

export function useMemberForm(defaultValues?: Partial<MemberInput>) {
  return useForm<MemberInput>({
    resolver: zodResolver(memberSchema),
    defaultValues: { role: "member", ...defaultValues },
  });
}
```

> `@hookform/resolvers` 尚未安装（项目脚手架阶段）—— 引入前先 `bun add`，并同步到依赖清单。

## components/*.tsx —— 容器 + 展示

容器（编排，可保持 Server）：

```tsx
// features/members/components/members-page.tsx
import { MembersToolbar } from "./members-toolbar";
import { MembersTable } from "./members-table";
import { PageHeader } from "@/components/blocks/page-header";

export function MembersPage({ page, q }: { page: number; q: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title="成员管理" description="管理团队成员与权限" />
      <MembersToolbar q={q} />
      <MembersTable page={page} q={q} />
    </div>
  );
}
```

展示 · 工具栏（URL 状态；Client，因为要用 `useRouter`/`useSearchParams`）：

```tsx
// features/members/components/members-toolbar.tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function MembersToolbar({ q }: { q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function onSearch(value: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("q", value);
    next.delete("page"); // 改搜索重置分页
    router.replace(`${pathname}?${next.toString()}`);
  }
  return <input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="搜索成员" />;
}
```

> URL 即状态：刷新、分享、前进后退都保留筛选。

展示 · 表格（Client，读 `HydrateBoundary` 注入的缓存）：

```tsx
// features/members/components/members-table.tsx
"use client";
import { useMembersList } from "../hooks/use-members";
import { MEMBER_ROLE_LABELS } from "../constants";

export function MembersTable({ page, q }: { page: number; q: string }) {
  const { data, isFetching } = useMembersList({ page, pageSize: 20, search: q });
  return (
    <div>
      {/* 用语义令牌：bg-card / border / text-muted-foreground，禁止写死颜色 */}
      {data?.map((m) => (
        <div key={m.id} className="border-b border-border py-2 text-body">
          {m.name} · <span className="text-muted-foreground">{MEMBER_ROLE_LABELS[m.role]}</span>
        </div>
      ))}
    </div>
  );
}
```

## index.ts —— barrel

```ts
export * from "./api";
export * from "./constants";
export * from "./schemas";
export * from "./types";
// hooks/components 按需导出
```

---

## 路由层（每个段配三件套）

```tsx
// app/(dashboard)/members/page.tsx —— Server 容器
import { dehydrate, HydrateBoundary } from "@tanstack/react-query";

import { MembersPage } from "@/features/members/components/members-page";
import { membersApi } from "@/features/members/api";
import { getQueryClient } from "@/lib/api/query-client";
import { qk } from "@/lib/api/query-keys";

export const metadata = { title: "成员管理" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1");
  const q = sp.q ?? "";

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: qk.members.list({ page, q }),
    queryFn: () => membersApi.list({ page, pageSize: 20, search: q }),
  });

  return (
    <HydrateBoundary state={dehydrate(queryClient)}>
      <MembersPage page={page} q={q} />
    </HydrateBoundary>
  );
}
```

其余 `loading.tsx` / `error.tsx` / `not-found.tsx` 用 `scripts/scaffold-route.mjs` 生成：

```bash
node .claude/skills/feature-blueprint/scripts/scaffold-route.mjs "src/app/(dashboard)/members"
```

---

## 注册到导航与权限

新增模块后，在两处登记：

```ts
// config/nav.ts —— 在对应 RailItem.panel[] 里加
{
  id: "members", label: "成员管理", icon: Users,
  href: "/members", permission: "user:read",
}

// config/permissions.ts —— 若用了新权限，加到 Permission 联合类型 + permissionMatrix
export type Permission = "user:read" | "user:write" | "role:read" | "role:write" | "audit:read" | "member:write";
```

> 导航/按钮用 `<Can permission="...">` 显隐（体验层）；后端做最终校验防 IDOR。

---

## 收尾

- `bun run typecheck && bun run lint` —— 跑过再算完（脚手架阶段桩多，别假设有效）。
- 自检无双取：首屏 `prefetchQuery` + `HydrateBoundary`，子组件 `useQuery` 命中注入缓存。
- 自检零写死颜色：全文件 grep 不到 hex / `gray-`。
- 自检三件套齐：`loading` / `error` / `not-found` 都在。
