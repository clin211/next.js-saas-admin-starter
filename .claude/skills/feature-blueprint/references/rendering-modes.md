# 渲染模式决策指南（SSR / CSR / SSG / ISR）

> next.js-saas-admin-starter 落地版。配合 `SKILL.md` 第 1 步使用。核心心法：**默认 RSC（SSR 动态），把交互压成小岛（CSR），公开稳定页静态化（SSG/ISR）。**

## 目录
- [一张图选模式](#一张图选模式)
- [SSR · 动态 RSC（本项目主力）](#ssr--动态-rsc本项目主力)
- [CSR · 客户端小岛](#csr--客户端小岛)
- [SSG · 构建时静态](#ssg--构建时静态)
- [ISR · 增量静态再生成](#isr--增量静态再生成)
- [缓存与失效（最容易踩的坑）](#缓存与失效最容易踩的坑)
- [流式渲染与 Suspense](#流式渲染与-suspense)
- [反模式清单](#反模式清单)

---

## 一张图选模式

```
这个页面/段 需要登录后才能看吗？
├─ 是 → SSR（动态）。到此为止，别往下选。缓存别人的数据 = 越权/串租户。
└─ 否（公开）
    │
    内容会变吗？
    ├─ 基本不变（登录页、关于、落地页）→ SSG
    ├─ 周期性变（定价、博客、更新日志）→ ISR（revalidate）
    └─ 每次请求都不同（带 query 的搜索结果落地）→ SSR（动态）

而「外壳里的某块交互」（无论上述哪种）→ 单独抽成 CSR 小岛（'use client'）。
```

> 为什么管理后台几乎全是 SSR：内容个性化、鉴权依赖 cookie/session、`proxy.ts` 在边缘做了守卫 —— 这些都让页面天然动态。强行静态化会缓存错对象。

---

## SSR · 动态 RSC（本项目主力）

**何时**：所有 `(dashboard)/` 下的页面。首屏数据服务端取，再 `HydrateBoundary` 注入。

**范式**（以 `members` 列表为例）：

```tsx
// app/(dashboard)/members/page.tsx —— Server Component（无 'use client'）
import { dehydrate, HydrateBoundary, keepPreviousData } from "@tanstack/react-query";

import { MembersPage } from "@/features/members/components/members-page";
import { getQueryClient } from "@/lib/api/query-client";
import { membersApi } from "@/features/members/api";
import { qk } from "@/lib/api/query-keys";
import { hasPermission, type Role } from "@/config/permissions";

export const metadata = { title: "成员管理" };

// searchParams 在 Next 16 是 Promise —— 必须 await
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1");
  const q = sp.q ?? "";

  // 权限闸（服务端，体验 + 兜底；前端 <Can> 仅做显隐）
  // TODO: currentRole 待接真实会话，见 lib/auth/can.tsx
  const role: Role = "Console";
  if (!hasPermission(role, "user:read")) {
    // 或重定向 / 或渲染无权限态
  }

  const queryClient = getQueryClient();
  // 预取首屏 —— 客户端就不会再取一次
  await queryClient.prefetchQuery({
    queryKey: qk.members.list({ page, q }),
    queryFn: () => membersApi.list({ page, pageSize: 20, search: q }),
  });

  return (
    <HydrateBoundary state={dehydrate(queryClient)}>
      {/* 容器组件可以是 Server；其内的交互子树自己 'use client' */}
      <MembersPage page={page} q={q} />
    </HydrateBoundary>
  );
}
```

**要点**：
- `searchParams` / `params` 在 Next 15+ 是 **`Promise`**，必须 `await`（见现有 `next-best-practices` 的 async-patterns）。
- `prefetchQuery` 抛错时 `HydrateBoundary` 会让客户端兜底重试 —— 首屏仍能渲染骨架（配合 `loading.tsx`），不会白屏。
- `getQueryClient()` 服务端每请求新建，所以预取不会污染其它请求。

---

## CSR · 客户端小岛

**何时**：需要 `useState` / 事件 / 浏览器 API / 仅客户端库（TanStack Query 的 `useMutation`、Motion 的 `motion.*`、cmdk、dnd-kit）/ 高交互（DataTable 主体）。注意是「子树」升客户端，**不是整页**。

**判据清单 —— 命中任一条才加 `'use client'`**：
1. 用了 `useState` / `useReducer` / `useEffect` / context 消费等 hooks。
2. 绑了事件（`onClick` / `onChange`）或用了浏览器 API（`window` / `localStorage` / `IntersectionObserver`）。
3. 引入仅客户端库（见上）。
4. 交互密度极高（大表格、拖拽看板）。

**反例**：PageHeader（纯标题 + 描述 + 操作槽）、EmptyState（纯展示）—— 这些保持 Server，别 `'use client'`。

**小岛与外壳的协作**：外壳（Server）取数并 `HydrateBoundary` 注入；小岛（Client）里 `useQuery` 读到的就是已注入的缓存，**首屏零请求**，后续翻页/搜索才发请求。

```tsx
// features/members/components/members-table.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { membersApi } from "@/features/members/api";

// 客户端读到的是 RSC 预取注入的缓存；翻页时才真正发请求
export function MembersTable({ page, q }: { page: number; q: string }) {
  const { data, isFetching } = useQuery({
    queryKey: qk.members.list({ page, q }),
    queryFn: () => membersApi.list({ page, pageSize: 20, search: q }),
    placeholderData: (prev) => prev, // 翻页时保留旧数据，减少跳动
  });
  // …渲染表格
}
```

---

## SSG · 构建时静态

**何时**：公开、内容稳定、不依赖请求的页面 —— `(auth)/login`、`(auth)/register`、营销首页、关于页。这些没有动态数据依赖，构建时静态生成，CDN 边缘命中，首屏极快。

**怎么做**：
- 默认就是静态 —— 只要 `page.tsx` 里没有 `cookies()` / `headers()` / `searchParams` / 动态 `fetch(..., { cache: 'no-store' })`，Next 会在构建时静态化。
- ⚠️ **公开页必须在 `proxy.ts` 的 matcher 里放行**。当前 matcher 只排除 `login|register|api|_next|favicon|带扩展名的文件`，**其它路径无 `session` cookie 一律被重定向到 `/login`**。所以新建公开页（`/pricing`、`/about`、`/(marketing)/...`）时，把路径段加进 `proxy.ts` 的负向先行断言，例如 `(?!login|register|pricing|api|...)`，否则访客看不到、被弹去登录。
- 多个静态路由用 `generateStaticParams` 预生成：
  ```tsx
  // app/pricing/[plan]/page.tsx
  export function generateStaticParams() {
    return PLANS.map((plan) => ({ plan: plan.id }));
  }
  export function generateMetadata({ params }: { params: Promise<{ plan: string }> }) {
    // generateMetadata 也同步静态化
  }
  ```

---

## ISR · 增量静态再生成

**何时**：公开、但内容会周期性更新 —— 定价页、更新日志、帮助文档、博客。享受静态的速度，又能定时刷新数据。

**怎么做**（二选一）：

```tsx
// 方式 A：在 fetch 上挂 revalidate（推荐，粒度细）
import { apiClient } from "@/lib/api/client";
const pricing = await apiClient.get<Plan[]>("/pricing", {
  next: { revalidate: 3600, tags: ["pricing"] }, // 1h 后后台再生成
});

// 方式 B：在段上挂
// app/pricing/page.tsx
export const revalidate = 3600;
```

**按需失效**（数据源变了立即刷新，不必等 revalidate）：

```tsx
import { revalidateTag } from "next/cache";
// 写操作后（管理员改了价格）
async function savePricing() {
  /* … */
  revalidateTag("pricing");
}
```

> 注意：ISR/SSG 只用于**公开内容**。受 `proxy.ts` 守卫的页面别用 —— 缓存会被所有访客共享。

---

## 缓存与失效（最容易踩的坑）

| 动作 | 失效手段 |
| --- | --- |
| mutation 改了 TanStack Query 管的数据 | `queryClient.invalidateQueries({ queryKey: qk.x.lists() })` |
| mutation 改了 RSC fetch + `tags` 缓存的数据 | `revalidateTag("x")` 或 `router.refresh()` |
| 表单提交后刷新整页 RSC 数据 | `router.refresh()`（重新跑 Server 取数） |
| 用户切换租户 | key 含 `tenantId` → 天然换缓存（见 `query-keys.ts` 注释） |

**双取 vs 单取**：
- ❌ 双取：RSC 顶层 `await fetch`，子组件又 `useQuery` 拉同一条，中间没 `HydrateBoundary`。
- ✅ 单取：RSC `prefetchQuery` → `dehydrate` → `<HydrateBoundary>` → 客户端 `useQuery` 命中缓存。

**apiClient 的缓存缺口**：当前 `request()` 把 `...rest` 透传给 `fetch`，所以 `next: { revalidate, tags }` 运行时生效；但 `RequestOptions`（`Omit<RequestInit, "body"> & {...}`）的类型里没有 `next` 字段，TS 会报错。补法：

```ts
// lib/api/client.ts —— 给 RequestOptions 补 next 类型
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: Json;
  params?: Record<string, string | number | boolean | undefined>;
  next?: NextFetchRequestConfig; // ← 补这一行
};
```

---

## 流式渲染与 Suspense

- 每个路由段的 `loading.tsx` 就是该段的 `<Suspense fallback>`，**先吐骨架再填数据**，首屏 TTFB 快。
- 段内还有「慢块」（如某张图表要等接口）时，再套一层 `<Suspense>`，让快的先出：
  ```tsx
  <DashboardStats />                 {/* 快，立即可见 */}
  <Suspense fallback={<ChartSkeleton />}>
    <SlowChart />                    {/* 慢，骨架先占位 */}
  </Suspense>
  ```
- `loading.tsx` 的骨架要与最终布局**同形**（同样的栅格、卡片结构），否则会跳（CLS 变差）。

---

## 反模式清单

- ❌ 给受登录保护的页面用 `export const revalidate` 或 SSG。
- ❌ 在 `'use client'` 组件里用 `async function`（客户端组件不能是 async —— 见 `next-best-practices/rsc-boundaries`）。
- ❌ Server 向 Client 组件传不可序列化的值（函数、`Date` 实例、class 实例、`ReactNode` 之外的东西）。
- ❌ 整页 `'use client'` 只为用一处 `useState` —— 把那一小块抽成小岛。
- ❌ 客户端组件里直接 `fetch` 而不走 `apiClient` / TanStack Query —— 丢了统一错误处理与缓存。
- ❌ 忘了 `await searchParams` / `await params`（Next 16 是 Promise）。
