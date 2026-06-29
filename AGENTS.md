<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# gc-Console 协作指南

> 本文件是面向所有 AI 编码代理（含 Cursor、Aider、Continue 等）的规范说明，也是本仓库的**单一事实源**。`CLAUDE.md` 通过 `@AGENTS.md` 引入本文件，请勿在两处重复维护内容——改动统一在此进行。
>
> ⚠️ 上方 `<!-- BEGIN:nextjs-agent-rules -->` 块由 Next.js CLI 自动维护，请勿手工编辑其内容。

## 项目概述

`gc-Console` 是一套 **B 端 SaaS 管理后台的前端基建**（非一次性 demo），目标是建立「设计体系 + 工程骨架 + 业务能力底座」，使后续业务模块能按约定快速组装。权威设计文档是 `docs/technical-solution.md`（约 57KB，代码注释中频繁出现的 `§4.4`、`§7.1` 等章节号即指向该文档）。

当前处于 **脚手架/基座阶段**：设计令牌、应用骨架、请求层、权限闸、TanStack Query 已就位；但存在大量桩（stub）与 TODO——例如 `currentRole` 写死为 `Console`、`proxy.ts` 中租户解析待实现、`features/projects` 是唯一业务模块模板。图表（Recharts/ECharts）、拖拽（dnd-kit）、i18n、富文本、测试框架**尚未引入**（文档有规划但未落地）。

## 技术栈

| 领域         | 选择                                                                           | 备注                                                               |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 框架         | **Next.js 16.2.9**（App Router）                                               | `proxy.ts` 取代 `middleware.ts`；详见下方约定                      |
| 语言         | TypeScript 5（`strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`） | 路径别名 `@/*` → `./src/*`                                         |
| 运行时/React | React 19.2.4                                                                   |                                                                    |
| 样式         | **Tailwind CSS v4**（CSS-first）                                               | 无 `tailwind.config`，令牌全写在 `src/app/globals.css` 的 `@theme` |
| 组件         | shadcn/ui（new-york style，拷贝式）+ `radix-ui` 统一包                         | 通过 `components.json` 配置，代码归项目所有                        |
| 数据/请求    | TanStack Query v5                                                              | SSR-safe 客户端工厂                                                |
| 校验         | **Zod v4**                                                                     | 表单与接口共用单一 schema                                          |
| 动画         | Motion（`motion/react`，即 Framer Motion 继任者）                              | 全局 `MotionConfig` 跟随 `prefers-reduced-motion`                  |
| 其他         | next-themes、cmdk（命令面板）、sonner（toast）、lucide-react                   |                                                                    |
| 包管理       | **bun**（`bun.lock`）                                                          |                                                                    |
| Lint/Format  | **oxlint + oxfmt**（非 ESLint/Prettier/Biome）                                 | 文档曾推荐 Biome，但实际落地用 oxc                                 |
| Git 钩子     | Husky + lint-staged + commitlint                                               |                                                                    |

## 常用命令

```bash
bun dev                 # 启动开发服务器（next dev）
bun run build           # 生产构建
bun run typecheck       # tsc --noEmit（类型检查，不产出）
bun run lint            # oxlint .（仅检查）
bun run lint:fix        # oxlint --fix .
bun run format          # oxfmt --write .
bun run format:check    # oxfmt --check .
```

提交时 Husky 会自动：`pre-commit` 跑 `lint-staged`（对暂存的 `*.{ts,tsx,js,...}` 执行 `oxlint --fix` + `oxfmt --write`），`commit-msg` 跑 commitlint 校验 Conventional Commits（`feat/fix/docs/chore/refactor/...`）。

**测试**：项目当前**未配置任何测试框架**（文档规划 Vitest + Playwright，但未安装、无脚本）。需要新增测试时，先与维护者确认引入哪套。

## 架构总览

分层 + 特性模块混合：基础设施按层组织（`lib/`、`components/`），业务按特性模块组织（`features/`），路由按 App Router 约定（`app/`）。

### `src/app/` — 路由层

- **路由分组**：`(auth)/`（未登录页，独立布局，含 `login`、`register`）与 `(dashboard)/`（已登录主应用，套 `AppShell`）。分组不污染 URL。
- 根 `layout.tsx`：`<html lang="zh-CN" suppressHydrationWarning>`、Geist 字体、挂载 `<Providers>`。
- `error.tsx`（路由级）+ `global-error.tsx`（兜底，替换 `<html>`）+ `loading.tsx` + `not-found.tsx` 齐备。

### `src/components/`

- `ui/`：原子组件，shadcn/ui 生成、归项目所有，可任意改。
- `blocks/`：复合业务组件（`PageHeader`、`EmptyState`），未来承载 `DataTable`/`FormBuilder` 等。
- `layout/`：应用骨架相关——`AppShell`（总装）、`SidebarRail`、`SidebarPanel`、`Topbar`、`CommandMenu`（⌘K）、`MobileNav`、`RouteProgress`。
- `providers/`：根 Provider 栈，挂载顺序为 ThemeProvider → MotionProvider → QueryClientProvider → TooltipProvider，并附带 `RouteProgress` 与 `Toaster`。

### `src/features/` — 特性模块（自包含）

每个业务模块独立成文件夹，含 `api.ts`（请求）、`schemas.ts`（Zod）、`types.ts`、`constants.ts`、`index.ts`（barrel 出口），以及 `components/`、`hooks/`。`features/projects/` 是参考模板。**原则：删除一个功能 = 删除一个文件夹**。

### `src/lib/` — 基础设施

- `api/client.ts`：单一 `apiClient`，泛型 `request<T>`，统一 baseURL（`env.NEXT_PUBLIC_API_BASE_URL`）、`credentials: "include"`、错误归一化（`ApiError.fromResponse`）、204 处理。
- `api/errors.ts`：错误类层级（`ApiError` 等），422→字段级回填、401→跳登录、403/429 等分型。
- `api/query-client.ts`：SSR-safe `getQueryClient()`——服务端每次请求新建，浏览器复用单例；默认 `staleTime: 60s`、`refetchOnWindowFocus: false`。
- `api/query-keys.ts`：`qk` 工厂，按「层级 + 参数」构造 key，便于按维度失效。
- `auth/can.tsx`：`<Can permission="...">` 权限闸（**目前 `currentRole` 是桩**，待接真实会话）。
- `env.ts`：`@t3-oss/env-nextjs` 的类型安全环境变量单一来源，启动时校验；**只通过 `env.*` 读 `process.env`**。
- `motion.tsx`：`MotionProvider`（`reducedMotion="user"`）。
- `tenant/`、`form/`、`table/`：为多租户/表单/表格预留的封装（多为空壳）。
- `utils.ts`：`cn()`（clsx + tailwind-merge）。

### `src/config/`

- `nav.ts`：导航数据模型——`RailItem`（一级，对应 Rail）→ 扁平 `panel[]`（二级页面，无分组）。`isPathActive()` 判断激活态。
- `permissions.ts`：RBAC 矩阵（`Role × Permission`）与 `hasPermission()`。
- `site.ts`：站点元信息。

### `src/proxy.ts` — Next.js 16 边缘代理

即旧版的 `middleware.ts`（**16 起改名 Proxy**）。承担认证守卫：无 `session` cookie 则重定向 `/login`（带 `callbackUrl`）。租户解析为 TODO。`matcher` 排除登录/注册、API、静态资源及任何带扩展名的文件。保持轻量，不访问数据库。

## 关键约定（务必遵守）

1. **RSC-first**：默认 Server Component；仅在使用 hooks / 浏览器 API / 仅客户端库（TanStack Query mutation、Motion 的 motion 组件、cmdk）时才加 `'use client'`。数据流：RSC 取首屏 → `prefetchQuery` + `<HydrateBoundary>` 注入 → 客户端 TanStack Query 接管增删改，避免「服务端取一次 + 客户端又取一次」。
2. **设计令牌是单一视觉事实源**：组件/页面**只能用语义令牌**（`bg-card`、`text-muted-foreground`、`border`），**禁止**写死 hex 或直接用 `--gray-*` 等原始值。所有视觉值定义在 `globals.css` 的 `@theme`（OKLCH 色彩）。
3. **URL 即状态**：列表的搜索/筛选/分页/排序/Tab 进 URL（刷新可保留、可分享、前进后退生效）。
4. **Zod schema 是单一事实源**：定义一次 → 推导 TS 类型 → 驱动表单校验 → 复用为接口校验（杜绝「前端放行、后端拒绝」）。
5. **权限前端两道闸**：① 导航/按钮用 `<Can permission="...">` / `config/permissions.ts` 显隐；② 后端做最终校验（防 IDOR）。前端显隐仅为体验。
6. **状态归属**：服务端数据 → TanStack Query；表单临时态 → React Hook Form；URL 状态 → URL；全局 UI 态 → Context。**拒绝用全局 store 管所有数据**。
7. **组件规范**：变体用 `cva`（不内联 className）；每个交互组件具备 默认/hover/focus-visible/disabled 四态；所有 UI 组件 `forwardRef`；优先原生语义标签与 Radix 行为原语，避免 `div + onClick` 做按钮。

## 重要注意点

- **AppShell 折叠行为与文档有出入**：`docs/technical-solution.md` §4.4 称 Panel「永不归零（最小保留约 56px 图标列）」，但 `app-shell.tsx` 实际实现为 `PANEL_COLLAPSED = 0`（完全收起，仅留 Rail）。以代码实现为准；若改动请同步注释与文档。
- **工具链是 oxc 而非 Biome**：文档 §13.2 推荐过 Biome，但 `package.json` 实际用 oxlint + oxfmt。配置见 `.oxlintrc.json` / `.oxfmtrc.json`。
- **新增环境变量**：先加到 `lib/env.ts` 的 schema（并设 `runtimeEnv`）与 `.env.example`，再使用。
- **新增 shadcn 组件**：经 `components.json` 别名（`@/components`、`@/lib/utils`、`@/ui` 等），落到 `components/ui/`；不在业务里散用原始 shadcn，而是经 `components/blocks/` 封装为业务语义组件。
- **next.config.ts 当前为空壳**（无自定义配置）。
- 代码注释多为「中文说明 + 英文代码」双语风格，新增代码请保持这一密度与风格。
