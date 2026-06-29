# Next.js SaaS 前端基建技术方案

> 版本：v1.0 · 适用：全新 SaaS 产品的前端基础设施搭建
> 定位：不是一次性 demo，而是一套**可演进 3 年**的工程基座 + 设计体系。

---

## 0. 目标与约束

**目标**：在 Next.js 上建立一套 SaaS 前端基建，覆盖「设计体系 + 工程骨架 + 业务能力底座」，使后续业务模块可以**按约定快速组装**，而不是每次重新决策。

**非目标（本期不做）**：后端服务实现、CI/CD 平台搭建、生产环境部署架构（仅给出对接约定）。

**核心约束**：

- 技术栈固定为用户给定清单（Next.js + TS + Tailwind + shadcn/ui + ...）。
- 面向 B 端 SaaS：多租户、权限、计费、复杂表格与表单、暗色模式、国际化是刚需。

---

## 1. 架构总览

### 1.1 架构原则

| 原则                       | 含义                                           | 在本方案中的体现                                   |
| -------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| **约定优于配置**           | 用目录/命名约定消除决策                        | 统一的 `features/` + `lib/` + `components/ui` 划分 |
| **服务端优先 (RSC-first)** | 默认 Server Component，必要时才 `'use client'` | 见 §4.1 划分矩阵                                   |
| **设计令牌单一事实源**     | 所有视觉值来自 token，禁止散落魔法值           | §5 设计体系 + Tailwind v4 `@theme`                 |
| **组合优于继承**           | 组件用 `cva` + 组合扩展，不写深层继承          | shadcn/ui 扩展策略 §6                              |
| **URL 即状态**             | 可分享、可刷新、可后退的状态都进 URL           | 列表筛选/分页/Tab §7.4                             |
| **类型驱动**               | API 契约生成类型，前后端共用                   | OpenAPI → TS §8.3                                  |
| **渐进增强可访问性**       | 键盘可达、语义化、尊重 `prefers-*`             | Radix 默认行为 + §5.6                              |

### 1.2 分层架构

```
┌─────────────────────────────────────────────────────────┐
│  App Router (app/)   路由 / 布局 / RSC 数据获取 / 元数据   │
├─────────────────────────────────────────────────────────┤
│  Features (领域模块)   每个业务模块自包含 UI+逻辑+类型     │
├─────────────────────────────────────────────────────────┤
│  Components            │  Blocks (复合)                   │
│   ui/ (原子, shadcn)   │   DataTable / FormBuilder / Shell │
├─────────────────────────────────────────────────────────┤
│  Lib (基础设施)  api / auth / query / form / utils / ... │
├─────────────────────────────────────────────────────────┤
│  Design Tokens (globals.css @theme) ← 单一视觉事实源      │
└─────────────────────────────────────────────────────────┘
```

### 1.3 技术栈一览（含版本策略与选型理由）

| 领域     | 技术                                | 版本策略               | 选型理由                                                          |
| -------- | ----------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| 框架     | Next.js (App Router)                | 最新稳定版（≥15.x）    | RSC、流式渲染、文件路由、Middleware、内置字体/图片优化            |
| 语言     | TypeScript                          | ≥5.6，`strict: true`   | 类型安全是大型 SaaS 的底线                                        |
| 样式     | Tailwind CSS                        | **v4**（CSS-first）    | 原子化 + CSS 变量原生融合，v4 用 `@theme` 定义 token 即生成工具类 |
| 基础组件 | shadcn/ui + Radix UI                | 最新（拷贝式，非依赖） | 代码归己有、可深度定制；Radix 提供 a11y 行为原语                  |
| 表格     | TanStack Table v8                   | v8.x                   | 无 UI 绑定的 headless 表格，支持虚拟化/排序/筛选/列拖拽           |
| 表单     | React Hook Form + Zod               | 最新                   | 非受控高性能；Zod 校验可推导类型，与服务端共享 schema             |
| 请求状态 | TanStack Query v5                   | v5.x                   | 缓存/重试/乐观更新/SWR 语义；与 RSC hydration 衔接                |
| 图标     | Lucide                              | 最新                   | Tree-shake 友好，与 shadcn 默认搭配                               |
| 图表     | Recharts（主）+ ECharts（复杂场景） | 按需                   | Recharts 与 React 声明式契合；ECharts 应对大数据量/复杂图         |
| 动画     | Motion (原 Framer Motion)           | v11+                   | 声明式、支持布局动画、可配合 `prefers-reduced-motion`             |
| 通知     | Sonner                              | 最新                   | 轻量、堆叠、promise 模式、a11y 良好                               |
| 主题     | next-themes                         | 最新                   | SSR 安全、无闪烁、`class` 策略                                    |
| 命令面板 | cmdk                                | 最新                   | 标准 command-k 体验，shadcn 已封装                                |
| 拖拽     | dnd-kit                             | 最新                   | 无障碍、可访问性最好的现代拖拽库，支持排序/网格/多容器            |
| 字体     | next/font (Geist)                   | 内置                   | 自托管、零 CLS、与 Vercel 设计语言一致                            |

> 说明：Tailwind **选 v4 而非 v3** 是本方案的关键决策之一。v4 用 CSS-first 配置（`@theme`），让设计令牌与工具类、暗色模式、OKLCH 色彩原生打通，免去了 v3 时代 `tailwind.config.js` 与 CSS 变量双轨维护的负担。详见 §5。

---

## 2. 项目结构

采用 **「分层 + 特性模块」混合**：基础设施按层组织（`lib/`、`components/`），业务按特性模块组织（`features/`），路由按 App Router 约定（`app/`）。

```
nextjs-saas/
├── app/                          # 路由层（App Router）
│   ├── (auth)/                   # 路由分组：未登录页（布局独立）
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/              # 路由分组：已登录主应用
│   │   ├── (home)/page.tsx
│   │   ├── projects/             # 业务模块路由
│   │   ├── members/
│   │   ├── settings/
│   │   ├── billing/
│   │   └── layout.tsx            # 应用骨架（侧边栏+顶栏）
│   ├── api/                      # 仅在需要 BFF/代理时使用
│   ├── error.tsx                 # 根级错误边界
│   ├── global-error.tsx          # 替换 <html> 的兜底错误边界
│   ├── loading.tsx
│   ├── not-found.tsx
│   ├── layout.tsx                # 根布局：<html>/<body>/主题/字体/Provider
│   └── globals.css               # ★ 设计令牌（@theme）+ 全局样式
│
├── components/
│   ├── ui/                       # 原子组件（shadcn/ui 生成，归项目所有）
│   ├── blocks/                   # 复合业务组件（DataTable、FormBuilder、PageHeader...）
│   └── layout/                   # AppShell、SidebarRail、SidebarPanel、Topbar、CommandMenu
│
├── features/                     # ★ 特性模块：自包含
│   └── projects/
│       ├── components/           # 该模块专属 UI
│       ├── hooks/                # useProjects / useProjectMutation
│       ├── api.ts                # 该模块的请求函数
│       ├── schemas.ts            # Zod schema
│       ├── types.ts              # 领域类型
│       ├── constants.ts
│       └── index.ts              # 模块出口（barrel）
│
├── lib/
│   ├── api/                      # 通用请求层
│   │   ├── client.ts             # fetch 封装 + 拦截器
│   │   ├── errors.ts             # 错误类型体系
│   │   └── query-keys.ts         # TanStack Query key 工厂
│   ├── auth/                     # 认证/会话/权限
│   ├── tenant/                   # 多租户解析
│   ├── form/                     # 表单通用封装
│   ├── table/                    # 表格通用封装
│   ├── utils.ts                  # cn() 等
│   └── constants.ts
│
├── hooks/                        # 全局通用 hooks
├── types/                        # 全局/公共类型（API 自动生成放 types/api/）
├── config/                       # 站点配置、导航、权限矩阵配置
│   ├── site.ts
│   ├── nav.ts
│   └── permissions.ts
├── styles/
│   └── typography.css            # 排版工具类（可选）
├── public/
│
├── .env.example
├── next.config.ts
├── tsconfig.json
├── components.json               # shadcn/ui 配置
├── biome.json / .eslintrc        # 见 §14
└── package.json
```

**为什么 `features/` 而非按 `components/pages/hooks` 横切？**
当一个模块（如 `projects`）涉及 UI+hooks+api+types+schema 时，横切目录会让一个需求散落在 5 个文件夹。特性内聚让「删除一个功能 = 删一个文件夹」成为可能，对 SaaS 长期演进至关重要。

---

## 3. Next.js App Router 架构

### 3.1 Server Component vs Client Component 划分

**默认 Server Component；以下三种情况才升为 `'use client'`：**

1. 使用了浏览器 API / 状态 / 事件（hooks、`onClick`、`useState`）。
2. 引入了只支持客户端的库（TanStack Query 的 mutation、dnd-kit、Motion 的 motion 组件、cmdk）。
3. 交互密度极高的组件（DataTable 主体）。

| 组件类别                       | 默认渲染                             | 说明                             |
| ------------------------------ | ------------------------------------ | -------------------------------- |
| 布局/页面外壳、PageHeader 文案 | Server                               | 减少客户端 JS                    |
| 导航配置读取                   | Server                               | 在 layout 中读取并下传           |
| 表单字段（受控输入）           | Client                               | 但 schema 在服务端复用           |
| DataTable                      | Client（容器）+ Server（行数据预取） | 数据 Server 取，交互 Client 处理 |
| 主题切换按钮                   | Client                               | next-themes 必须 client          |

**数据流模式**：Server Component 获取首屏数据 → 通过 `dehydrate/HydrateBoundary` 注入 → Client 侧 TanStack Query 接管后续增删改与重新验证。避免「Server 取一次 + Client 又取一次」的双取。

### 3.2 路由组织

- **路由分组 `(...)`**：`(auth)` / `(dashboard)` 让不同布局共存而不污染 URL。
- **并行路由 `@slot`**：用于仪表盘「多面板独立加载/独立错误」、设置页左右分栏。
- **拦截路由 `(.)`/`(..)`**：用于「列表点开详情走模态」的体验（如点击成员卡片弹出资料，刷新则落到 `/members/[id]` 完整页）。
- **动态段**：`[tenant]` 用于多租户路径前缀（若采用路径隔离租户）。

### 3.3 布局层级

```
<RootLayout>            app/layout.tsx   <html lang>, 主题 Provider, 字体, QueryClientProvider
  └ <DashboardLayout>   app/(dashboard)/layout.tsx   AppShell(Rail+Panel+Topbar), 会话校验
      └ <Page>          各 page.tsx
```

### 3.4 Middleware（边缘中间件）

承担**认证守卫 + 租户解析**，在渲染前完成：

- 校验会话 token，未登录重定向 `/login`（并带上 `callbackURL`）。
- 从子域名/路径/会话解析当前 `tenantId`，写入请求头供下游使用。
- 做 A/B 或灰度的轻量分流（可选）。

> Middleware 必须保持轻量（仅读 cookie/header、重定向），不访问数据库。

### 3.5 数据获取与缓存

- RSC 内直接 `await fetch()` 并用 Next 的 `revalidate` / `tags` 控制缓存。
- 写操作（mutation）后用 `router.refresh()` 或 `revalidateTag()` 失效缓存。
- TanStack Query 负责客户端侧的「乐观更新 + 失效 + 重试」。

---

## 4. 设计体系（Design System）★ 本方案核心

> 设计体系 = **设计令牌（Token）+ 主题系统 + 组件规范 + 布局系统 + 内容规范**。所有视觉决策都收敛到令牌，令牌是唯一的「视觉事实源」。

### 4.1 设计令牌（Design Tokens）

令牌分三层：**Primitive（原始值）→ Semantic（语义）→ Component（组件级，可选）**。落到 Tailwind v4 中，全部以 CSS 变量定义于 `app/globals.css` 的 `@theme`，自动生成 `bg-background`、`text-foreground`、`rounded-lg` 等工具类。

#### 4.1.1 色彩体系（OKLCH）

**为什么用 OKLCH**：感知均匀（同亮度跨色相视觉一致）、暗色模式调色更可控、广色域友好。Tailwind v4 原生支持。

**A. 基础调色板（Primitive，中性色族）**

```css
/* globals.css 内，作为设计源（不直接被组件使用） */
:root {
  /* 灰阶 9 级（从纯白到近黑），作为 card/border/muted 的素材 */
  --gray-50: oklch(0.985 0.002 247);
  --gray-100: oklch(0.967 0.003 247);
  --gray-200: oklch(0.928 0.006 264);
  --gray-300: oklch(0.872 0.011 264);
  --gray-400: oklch(0.707 0.015 264);
  --gray-500: oklch(0.551 0.016 264);
  --gray-600: oklch(0.446 0.015 264);
  --gray-700: oklch(0.371 0.013 264);
  --gray-800: oklch(0.279 0.012 264);
  --gray-900: oklch(0.21 0.011 264);
  --gray-950: oklch(0.145 0.01 264);
}
```

**B. 语义令牌（Semantic，组件直接消费）— 浅色**

```css
:root {
  /* 表面/文字 */
  --background: oklch(1 0 0); /* 页面底色 */
  --foreground: oklch(0.145 0 0); /* 主文字 */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* 品牌/主操作（可被租户主题覆盖，见 §4.2） */
  --primary: oklch(0.546 0.215 262); /* 默认靛蓝 */
  --primary-foreground: oklch(0.985 0 0);

  --secondary: oklch(0.967 0.003 247);
  --secondary-foreground: oklch(0.21 0.011 264);
  --muted: oklch(0.967 0.003 247);
  --muted-foreground: oklch(0.551 0.016 264);
  --accent: oklch(0.967 0.003 247);
  --accent-foreground: oklch(0.21 0.011 264);

  /* 反馈色 */
  --destructive: oklch(0.577 0.245 27.3);
  --destructive-foreground: oklch(0.985 0 0);
  --success: oklch(0.627 0.17 149);
  --warning: oklch(0.76 0.16 84);
  --info: oklch(0.65 0.15 240);

  /* 描边/输入/聚焦环 */
  --border: oklch(0.928 0.006 264);
  --input: oklch(0.928 0.006 264);
  --ring: oklch(0.546 0.215 262); /* 通常=primary */

  /* 数据可视化（图表主色族，色盲友好） */
  --chart-1: oklch(0.546 0.215 262);
  --chart-2: oklch(0.627 0.17 149);
  --chart-3: oklch(0.76 0.16 84);
  --chart-4: oklch(0.65 0.15 240);
  --chart-5: oklch(0.64 0.2 17);

  /* 侧边栏（深浅可独立于主体） */
  --sidebar: oklch(0.985 0.002 247);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.546 0.215 262);
  --sidebar-accent: oklch(0.967 0.003 247);
  --sidebar-border: oklch(0.928 0.006 264);
  --sidebar-ring: oklch(0.546 0.215 262);
}
```

**C. 语义令牌 — 暗色**

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);

  --primary: oklch(0.623 0.188 262); /* 暗色下提亮以保证对比度 */
  --primary-foreground: oklch(0.205 0 0);

  --secondary: oklch(0.279 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.279 0 0);
  --muted-foreground: oklch(0.707 0 0);
  --accent: oklch(0.329 0 0);
  --accent-foreground: oklch(0.985 0 0);

  --destructive: oklch(0.637 0.209 25);
  --destructive-foreground: oklch(0.985 0 0);
  --success: oklch(0.696 0.15 149);

  --border: oklch(0.279 0 0);
  --input: oklch(0.329 0 0);
  --ring: oklch(0.623 0.188 262);

  --chart-1: oklch(0.623 0.188 262);
  --chart-2: oklch(0.696 0.15 149);
  /* ... 其余图表色相应提亮 */

  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.279 0 0);
}
```

**D. 暴露给 Tailwind（@theme inline）**

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... 其余语义色同名映射 ... */
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-chart-1: var(--chart-1); /* ... chart-2~5 */

  --color-sidebar: var(--sidebar);
  /* ... sidebar-* ... */

  /* 字体 */
  --font-sans:
    var(--font-geist-sans), ui-sans-serif, system-ui, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace;

  /* 圆角 */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* 动效（见 §4.1.6） */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
}

:root {
  --radius: 0.625rem;
}
```

**色彩使用规则**：

- 组件/页面**只能使用语义令牌**（`bg-card`、`text-muted-foreground`），**禁止**直接用 `--gray-500` 或写死 `#fff`。
- 文本对比度须满足 WCAG AA（正文 4.5:1，大字 3:1）。`muted-foreground` 仅用于辅助文字，不可用于关键信息。

#### 4.1.2 排版体系（Typography）

**字体**：通过 `next/font/google` 加载 Geist Sans + Geist Mono（自托管、零布局偏移）。中文 fallback 串入字体栈，保证中日韩渲染。

**流体字号阶梯（clamp 自适应）**：

| Token           | 用途              | 值（建议）                              | 行高 | 字重                             |
| --------------- | ----------------- | --------------------------------------- | ---- | -------------------------------- |
| `text-display`  | 营销/空状态大标题 | `clamp(2.5rem, 2rem + 2vw, 3.75rem)`    | 1.1  | 700                              |
| `text-h1`       | 页面主标题        | `clamp(1.75rem, 1.5rem + 1vw, 2.25rem)` | 1.2  | 600                              |
| `text-h2`       | 区块标题          | `1.5rem`                                | 1.3  | 600                              |
| `text-h3`       | 卡片标题          | `1.25rem`                               | 1.4  | 600                              |
| `text-h4`       | 小节标题          | `1.125rem`                              | 1.4  | 600                              |
| `text-body`     | 正文              | `0.9375rem`（15px）                     | 1.6  | 400                              |
| `text-small`    | 次要正文          | `0.8125rem`（13px）                     | 1.5  | 400                              |
| `text-caption`  | 标签/说明         | `0.75rem`                               | 1.5  | 500                              |
| `text-overline` | 上标小标签        | `0.6875rem`                             | 1.4  | 600, 大写, letter-spacing 0.08em |
| `text-code`     | 行内代码          | 同 body                                 | —    | 400, mono                        |

实现：在 `@theme` 注册 `--text-display` 等即可用 `text-display`，或单独维护 `styles/typography.css`。

**SaaS 排版要点**：B 端表格/表单密集，正文偏小（13–15px）信息密度高，但行高足够保证可读。

#### 4.1.3 间距体系（Spacing）

- 基础栅格 **4px**。Tailwind v4 由 `--spacing: 0.25rem` 派生整套 `p-1…p-*`。
- **组件内间距约定**（消除「按钮 padding 该写 2 还是 3」的争论）：
  - 紧凑模式（表格行、菜单项）：`gap-2` / `px-2 py-1`
  - 默认（卡片、表单）：`gap-4` / `p-4`
  - 宽松（页面分区）：`gap-6` / `p-6`
  - 区块垂直节奏：页面主区块间 `py-8 ~ py-12`

#### 4.1.4 圆角体系（Radius）

`--radius` 为基准（`0.625rem`），派生 sm/md/lg/xl/2xl。**按元素尺度选圆角**：小控件（badge、tag）用 sm；按钮/输入用 md；卡片/弹层用 lg；大型容器/空状态用 xl。**全站统一**，避免同一类元素出现多种圆角。

#### 4.1.5 阴影与层级（Elevation）

不要用 Tailwind 默认大阴影，B 端追求**克制**。自定义 3 档：

| Token         | 用途                             | 强度         |
| ------------- | -------------------------------- | ------------ |
| `shadow-xs`   | 细边框替代（focus ring、分割）   | 仅 1px 偏移  |
| `shadow-sm`   | 卡片、下拉悬停                   | 轻           |
| `shadow-md`   | popover、命令面板                | 中           |
| `shadow-lg`   | modal、drawer                    | 重           |
| `shadow-glow` | primary 焦点光晕（半透明品牌色） | 可选，强调态 |

```css
@theme inline {
  --shadow-sm: 0 1px 2px 0 oklch(0.21 0.006 285 / 0.05);
  --shadow-md:
    0 4px 12px -2px oklch(0.21 0.006 285 / 0.1), 0 2px 6px -2px oklch(0.21 0.006 285 / 0.06);
  --shadow-lg:
    0 12px 32px -4px oklch(0.21 0.006 285 / 0.14), 0 4px 10px -4px oklch(0.21 0.006 285 / 0.08);
}
```

#### 4.1.6 动效体系（Motion）

**令牌化，统一节奏**。一切过渡引用令牌，禁止散落 `transition duration-300`：

| Token               | 值                        | 场景               |
| ------------------- | ------------------------- | ------------------ |
| `--duration-fast`   | 150ms                     | hover、颜色变化    |
| `--duration-normal` | 200ms                     | 大小、位移（默认） |
| `--duration-slow`   | 300ms                     | 进出场、布局动画   |
| `--ease-standard`   | cubic-bezier(0.4,0,0.2,1) | 常规               |
| `--ease-emphasized` | cubic-bezier(0.2,0,0,1)   | 进场、强调         |

**原则**：

- 动效服务于反馈与空间连续性，**不为炫技**；幅度小（4–8px 位移为主）。
- **必须尊重 `prefers-reduced-motion`**：Motion 全局配置降级为仅淡入淡出。

```ts
// lib/motion.ts
import { MotionConfig } from "motion/react";
export const MotionProvider = ({ children }) => (
  <MotionConfig
    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    reducedMotion="user"   // 关键：跟随系统设置
  >
    {children}
  </MotionConfig>
);
```

#### 4.1.7 Z-index 层级（Stacking）

集中定义，避免「9999 大战」：

```css
@theme inline {
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-drawer: 1200;
  --z-modal: 1300;
  --z-popover: 1400;
  --z-toast: 1500; /* Sonner */
  --z-tooltip: 1600;
  --z-command: 1700; /* cmdk 面板 */
}
```

#### 4.1.8 状态令牌

为组件状态预留语义，便于统一调整：

- hover：背景向 `accent` 收敛；文字不变深。
- focus-visible：`ring-2 ring-ring ring-offset-2 ring-offset-background`（统一聚焦样式）。
- disabled：`opacity-50 pointer-events-none`。
- loading：用 Skeleton/Spinner，按钮内置 spinner 不改变布局。
- selected/active（侧边栏）：`bg-sidebar-accent text-sidebar-accent-foreground`。

---

### 4.2 主题系统（next-themes + 多租户主题）

**机制**：`next-themes` + `class` 策略 + `suppressHydrationWarning`。`<html class="dark">` 切换暗色，所有色值经 CSS 变量响应，**零 JS 重绘**。

```tsx
// app/layout.tsx
import { ThemeProvider } from "next-themes";
export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange // 切换时不做过渡动画，避免闪
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**三态**：`light` / `dark` / `system`（跟随 `prefers-color-scheme`），切换器用 `<DropdownMenu>` 或 segmented control。

**★ SaaS 多租户品牌色（关键能力）**：
不同 workspace 可自定义品牌主色。实现：运行时在 `DashboardLayout` 内根据租户配置，**覆盖 `--primary` 及其衍生值**，作用域限定在该子树：

```tsx
// 通过 style 注入，作用域天然隔离
<section
  style={
    {
      // 后端返回的租户品牌色（oklch 或 hsl），前端做明度派生
      "--primary": tenant.brandColor,
      "--ring": tenant.brandColor,
    } as React.CSSProperties
  }
>
  {children}
</section>
```

> 注意：品牌色仅覆盖 primary 系，中性色/反馈色保持产品统一，保证整体专业感不被「彩虹化」。派生 darker/lighter 可用 `color-mix(in oklch, var(--primary), white 20%)` 现代写法。

---

### 4.3 组件设计规范

**变体管理**：全部用 `class-variance-authority (cva)`。每个组件定义清晰的维度：

- **size**：`sm | default | lg | icon`
- **variant**：`default | secondary | outline | ghost | destructive | link`
- **状态**：由 `data-[state]` 或 Tailwind 伪类驱动

```ts
// components/ui/button.tsx（示例骨架）
import { cva } from "class-variance-authority";
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-small font-medium transition-[background,color,box-shadow] duration-(--duration-fast) ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3",
        default: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

**组件通用约定**：

1. **每个组件必有四个状态**：默认 / hover / focus-visible / disabled（必要时 loading）。
2. **图标 + 文字组合**：图标 16px，gap-2，图标颜色跟随文字。
3. **间距统一**用令牌，不写魔法像素。
4. **可组合**：用 `asChild`（Radix Slot）支持 `Button asChild` → 渲染成 `<a>` 或 `<Link>`。
5. **forwardRef**：所有 UI 组件转发 ref。
6. **a11y**：交互元素必须有可聚焦语义，禁用 `div + onClick` 做按钮。

---

### 4.4 布局系统（App Shell）

SaaS 主界面采用 **双列侧边栏（Rail + Panel）+ 顶栏 + 内容区** 的「三栏 + 顶栏」结构。这是 Linear / VS Code / Notion 等现代 B 端产品的成熟范式：**Rail** 负责一级导航（纯图标），**Panel** 负责当前一级项的二级上下文导航。层级深、模块多的 SaaS 借此在不牺牲信息密度的前提下保持导航清晰——且 Rail 常驻不消失，用户永远知道「家」在哪。

```
┌──────┬──────────────┬────────────────────────────────────────┐
│  🏢  │ 工作台    🔍  │  Topbar:  面包屑       ⌘K   🔔  +  🌙 👤 │
│      │              ├────────────────────────────────────────┤
│      │ ▌仪表盘       │  ┌──────────────────────────────────┐  │
│ ▣    │   用户管理     │  │  PageHeader（标题 + 操作）        │  │
│ ○    │   提示词管理   │  ├──────────────────────────────────┤  │
│ ○    │   角色权限     │  │                                  │  │
│      │   审计日志     │  │  主内容区                          │  │
│      │              │  │  （max-w 居中 或 全宽）            │  │
│ ? 🌙 │              │  │                                  │  │
│ 👤   │ ── 升级/配额 ─│  └──────────────────────────────────┘  │
└──────┴──────────────┴────────────────────────────────────────┘
 Rail 56px（恒定） · Panel 展开 240px / 收起 56px（仅图标，永不到 0）
 ▣=当前激活的 Rail 项（工作台）  ▌=Panel 内当前页（仪表盘，展开态）
```

**三栏职责划分（刻意避免元素在多处重复出现）**：

| 区域               | 宽度                                                                        | 职责                     | 内容（顶 → 底）                                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rail（轨道）**   | 固定 **56–64px**（`w-14`–`w-16`）                                           | 一级模块导航 + 全局入口  | 顶部：工作区 Logo/头像（点击 → 工作区切换器，**全局唯一**）；中部：一级模块图标（如「工作台」「设置」…，**每个对应一个 Panel**）；底部：帮助、主题切换、用户头像                                               |
| **Panel（面板）**  | **展开 240–280px**（`w-60`–`w-72`）/ **收起 ~56px**（仅图标），**永不归零** | 当前 Rail 项下的页面导航 | 顶部：当前 Rail 模块标题（如「工作台」）+ 内联搜索（收起档隐藏）；中部：**扁平页面列表**（平级页面，无分组）——展开=图标+文字、收起=仅图标（hover 出 Tooltip），激活态高亮、可滚动；底部：升级/配额条、快捷操作 |
| **Topbar（顶栏）** | 占**内容区**宽度（不全宽）                                                  | 页面级上下文 + 全局操作  | 左：面包屑/页面标题（移动端在此放汉堡按钮打开 Rail）；右：⌘K 搜索、通知、快速创建（+）、用户菜单                                                                                                               |

> **为什么 Panel 不分组？** 一个 Rail 项（如「工作台」）下的页面（仪表盘 / 用户管理 / 提示词管理…）是**平级**的，强加「分组头」只会增加层级负担。扁平列表让用户一眼扫完该模块全部入口；若未来某模块页面变多，用一条分隔线（非可折叠分组）做轻量区隔即可，不引入折叠交互。

> **为什么工作区切换器在 Rail 顶部？** 工作区是最高层级的「空间」上下文，放在最左、最稳定的 Rail 顶部（点 Logo/头像触发），**全局唯一**——不与 Panel 的模块导航、Topbar 的页面操作重复。

**导航数据模型（`config/nav.ts`）**：Rail 一项 → Panel 一个扁平 `panel[]`，结构直接对应 UI，权限过滤在此层做：

```ts
import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  ShieldCheck,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

type NavItem = { id: string; label: string; icon: LucideIcon; href: string; permission?: string };
type RailItem = { id: string; label: string; icon: LucideIcon; panel: NavItem[] };

export const nav: RailItem[] = [
  {
    id: "workbench",
    label: "工作台",
    icon: LayoutDashboard,
    panel: [
      { id: "dashboard", label: "仪表盘", icon: LayoutDashboard, href: "/dashboard" },
      { id: "users", label: "用户管理", icon: Users, href: "/users", permission: "user:read" },
      { id: "prompts", label: "提示词管理", icon: MessageSquareText, href: "/prompts" },
      {
        id: "roles",
        label: "角色权限",
        icon: ShieldCheck,
        href: "/roles",
        permission: "role:read",
      },
      {
        id: "audit",
        label: "审计日志",
        icon: ScrollText,
        href: "/audit",
        permission: "audit:read",
      },
    ],
  },
  // …其它 Rail 项（如「设置」），同样为扁平 panel[]
];
```

> 渲染时：Rail 遍历 `nav` 取图标；Panel 根据「当前激活的 Rail 项 id」取出其 `panel[]`——**展开档**渲染「图标+文字」列表，**收起档**渲染居中图标列（hover 出 Tooltip 显示文字）；无权限的 `panel` 项在此过滤掉。`NavItem.icon` 是收起档可用的前提。

**折叠与可见性（双约束：Rail 宽度恒定 · Panel 永不到 0）**：

- **Panel 可收/展，但永不归零**：Panel 有两个宽度档——**展开** `--shell-panel`（240px，图标+文字）和**收起** `--shell-panel-collapsed`（~56px，**仅图标**）。收起时**不是 0px**，仍显示当前模块各页面的图标列、可继续点击导航，hover 图标用 Tooltip 显示文字。**只有 Panel 的宽度在变**，用 Motion 在两档间做 `width` 过渡（配合 `prefers-reduced-motion` 降级为瞬切）。
- **Rail 宽度恒定（不变量 / hard constraint）**：无论 Panel 处于哪一档，**Rail 永远保持 `--shell-rail` 宽度，分毫不差**。实现上 Rail 用 `shrink-0 grow-0` 锁死基准宽度，**不参与任何宽度动画**——杜绝「Panel 一动、Rail 也跟着跳」的抖动。
- **Rail 常驻**：桌面端始终可见（仅图标），作为永不消失的地标；点击任意 Rail 图标即切到对应 Panel（Panel 维持当前档位，不强制展开）。
- **折叠触发器**：放在 Rail/Panel 交界处的一个小箭头按钮，切换 Panel 两档。
- **移动端（< md）**：Rail 与 Panel 合并为单个抽屉（Sheet），由 Topbar 汉堡按钮触发；移动端不分两档，直接展示合并列表。

**视觉处理**：Rail 与 Panel 均消费 `--sidebar*` 令牌族（`bg-sidebar`、`text-sidebar-foreground`、激活态 `bg-sidebar-accent`、分隔线 `border-sidebar-border`）。如需更强层级感，可让 Rail 取略深的衍生面（实现时新增**单**令牌 `--sidebar-rail` 即可，不破坏体系）；**严禁**为两者写死不同的 hex。

**AppShell 实现（Flex，双约束一并满足）**：横向 Flex 容器，三段互相独立，只有 Panel 在两档宽度间动：

```tsx
<div className="flex h-svh">
  {/* ① Rail：恒定宽度，shrink-0/grow-0 锁死，绝不参与动画 */}
  <SidebarRail className="w-(--shell-rail) shrink-0 grow-0" />

  {/* ② Panel：只在两档宽度间插值，永不到 0；overflow-hidden 防收起时溢出闪烁 */}
  <SidebarPanel
    className="shrink-0 overflow-hidden"
    style={{ width: panelWidth }} // Motion 在 var(--shell-panel) ↔ var(--shell-panel-collapsed) 间插值
  />

  {/* ③ 内容区：吸收剩余宽度；min-w-0 防 flex 子项撑爆 */}
  <main className="min-w-0 flex-1">{children}</main>
</div>
```

- **双约束**：Rail `shrink-0 grow-0`（宽度恒定）+ Panel `shrink-0` 且 `width` 始终 ∈ [`--shell-panel-collapsed`, `--shell-panel`]（永不归零）+ 内容 `min-w-0 flex-1`（吸收余量不撑爆）。
- **为什么用 Flex 而非 CSS Grid**：Grid 折叠要切换 `grid-template-columns` 或动 track 变量（须 `@property` 注册才平滑），且 Rail 列可能被网格重新分配波及；Flex + `shrink-0 grow-0` 让 Rail 的宽度成为**不被任何布局重算触碰的硬固定**，最省心地满足「Rail 宽度恒定」。
- **Panel 始终挂载**：两档之间只是 `width` 变化，DOM 不卸载，保证切换顺滑、状态连续；展开档渲染「图标+文字」，收起档用 `flex` 居中渲染图标列（配 Tooltip）。
- 布局令牌写入 `@theme`：`--shell-rail: 56px`、`--shell-panel: 240px`、`--shell-panel-collapsed: 56px`；移动端不使用此 Flex 骨架，改为抽屉。

**内容容器**：保持两档 `max-w`——表单类 `max-w-3xl` 居中、表格/仪表盘类全宽（`max-w-screen-2xl`）。统一 `<PageHeader title description actions />` 保证页面头部一致。

**页面级栅格**：内容区内以 Flex + `grid-cols-12` 组合，预设：列表页（单列）、详情页（主+侧 `lg:grid-cols-[1fr_320px]`）、设置页（Panel 内再做左导航 + 右内容的二级分栏）。

---

### 4.5 响应式策略

**断点（Tailwind v4 默认，移动优先）**：`sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`。

| 区域                | < md（移动）                 | md–lg（平板）          | ≥ lg（桌面）             |
| ------------------- | ---------------------------- | ---------------------- | ------------------------ |
| 侧边栏 (Rail+Panel) | 合并为抽屉 Sheet（汉堡触发） | Rail 常驻 + Panel 抽屉 | Rail 常驻 + Panel 可折叠 |
| 表格                | 卡片化 或 横向滚动           | 表格                   | 表格                     |
| 表单                | 单列                         | 单列                   | 双列                     |
| 顶栏                | 精简（汉堡+搜索）            | 完整                   | 完整                     |

**容器查询**：对组件级响应（如卡片内部布局随**自身宽度**变化）用 Tailwind v4 内置 `@container`，比媒体查询更精准。

---

### 4.6 无障碍（Accessibility / a11y）

- **键盘**：所有交互可达，可见焦点环（`focus-visible`），`Esc` 关闭弹层，`Trap` 焦点（Radix 自带）。
- **语义**：用语义化标签（`nav/header/main/dialog`），图标按钮带 `aria-label`。
- **对比度**：色彩令牌满足 WCAG AA（见 §4.1.1）。
- **动效**：尊重 `prefers-reduced-motion`（§4.1.6）。
- **表单**：`label` 关联 `input`，错误用 `aria-describedby` 关联，`aria-invalid`。
- **表格**：复杂表格用 `scope`、`<caption>`。
- **ARIA**：仅在原生语义不足时使用，优先用原生元素。

---

### 4.7 内容规范（Content / 微文案）

统一术语与语气，减少「确定/确认/好了」并存：

- 操作按钮：动词开头（创建项目、保存更改、删除成员）。
- 主操作用实色 primary，破坏性操作用 destructive 且二次确认。
- 空状态：图标 + 一句话说明 + 引导主操作（不要只显示「暂无数据」）。
- 错误提示：说清**发生了什么 + 用户能做什么**，不暴露技术堆栈。
- Toast：成功用 `success`、失败用 `error` 并可带「重试」。

---

## 5. 组件库策略（shadcn/ui + Radix UI）

### 5.1 采用原则

- shadcn/ui 是**「拷贝进项目」**的组件集合，不是 npm 依赖 → **代码完全归项目所有，可任意改**。
- Radix UI 提供**无样式、a11y 完备的行为原语**（Dialog/DropdownMenu/Popover/Select/Tabs/Tooltip/...），shadcn 在其上加 Tailwind 样式。
- 因此我们既享受 Radix 的稳健行为，又有 100% 样式掌控。

### 5.2 组织

- 原子组件统一放 `components/ui/`，通过 `components.json` 配置（style、base-color、css-variables、aliases）。
- **不直接在业务里散用原始 shadcn**，而是经由 `components/blocks/` 封装成业务语义组件（如 `<DataTable>`、`<FormBuilder>`、`<ConfirmDialog>`、`<EmptyState>`、`<PageHeader>`、`<StatCard>`）。

### 5.3 扩展与定制

- 新增 variant 走 `cva`，不内联 className。
- 需要的行为原语若 shadcn 未覆盖，直接 `@radix-ui/react-*` 自封装进 `components/ui/`。

---

## 6. 数据与状态管理

### 6.1 状态分类与归属

| 状态类型                      | 归属                 | 工具                            |
| ----------------------------- | -------------------- | ------------------------------- |
| 服务端数据（列表/详情/字典）  | Server State         | TanStack Query                  |
| 表单临时态                    | 局部                 | React Hook Form                 |
| URL 状态（筛选/分页/Tab）     | URL                  | `useSearchParams` / `nuqs`      |
| 全局 UI 态（侧边栏折叠/主题） | Client               | Context / zustand（按需，慎用） |
| 跨组件共享业务态              | 尽量上提到 RSC / URL | 避免滥用全局 store              |

> 原则：**能用 URL 不用 state，能上提不下沉，能服务端不客户端**。SaaS 前端最常见的反例是用一个全局 store 管所有数据——应交给 TanStack Query。

### 6.2 TanStack Query 规范

- **Query Key 工厂**（强类型、可推断）：`lib/api/query-keys.ts`
  ```ts
  export const qk = {
    projects: {
      all: ["projects"] as const,
      list: (params: ProjectListParams) => ["projects", "list", params] as const,
      detail: (id: string) => ["projects", "detail", id] as const,
    },
  } as const;
  ```
- **统一 hooks 模式**：`useProjects()` / `useProject(id)` / `useCreateProject()`，封装在 `features/*/hooks/`。
- **缓存策略**：字典类（角色、地区）`staleTime: Infinity`；列表默认短缓存；详情按需。
- **乐观更新**：mutation `onMutate` 预写缓存，`onError` 回滚，`onSettled` 失效/重取。
- **与 RSC 衔接**：首屏用 `prefetchQuery` + `<HydrateBoundary>`，避免客户端二次请求。

### 6.3 URL 状态

列表页的「搜索/筛选/分页/排序/列显隐」全部进 URL，用 `nuqs`（类型安全的 search-params 管理）。效果：刷新保留、可分享、浏览器前进后退生效。

---

## 7. API 层设计

### 7.1 fetch 封装（`lib/api/client.ts`）

- 单一 `apiClient`，内置 baseURL、超时、credentials、**统一错误归一化**、**401 自动登出/刷新**、请求/响应拦截。
- 泛型化：`request<T>(...)` 返回强类型。
- 既可用于 RSC（`fetch` 直连 + Next 缓存），也可封装给 TanStack Query 使用。

### 7.2 错误体系（`lib/api/errors.ts`）

不要把错误当成 `string`。定义类层级：

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export class ValidationError extends ApiError {
  /* 422, 含字段级 details */
}
export class AuthError extends ApiError {
  /* 401 */
}
export class ForbiddenError extends ApiError {
  /* 403 */
}
export class NotFoundError extends ApiError {
  /* 404 */
}
export class RateLimitError extends ApiError {
  /* 429, 含 retryAfter */
}
```

- 422 → 表单字段级错误回填；
- 401 → 跳登录；
- 403 → 显示无权限；
- 429 → Toast 提示并禁用操作至重试时间；
- 5xx → 通用错误 + 重试。

### 7.3 类型生成（契约驱动）

- 后端提供 OpenAPI/Swagger → 用脚本生成 `types/api/`（已有 `openapi-to-typescript` 能力）。
- **前后端共享 Zod schema**：表单校验与接口校验用同一套 schema，杜绝「前端放行、后端拒绝」。

### 7.4 认证 Token 管理

- HttpOnly Cookie 存 access/refresh token（防 XSS），前端不接触明文。
- Middleware 边缘校验；客户端请求自动带 cookie（`credentials: "include"`）。

---

## 8. 表单系统（React Hook Form + Zod）

### 8.1 架构

- **Zod schema 为单一事实源**：定义一次 → 推导 TS 类型 → 驱动 RHF 校验 → 复用为接口校验。
- 封装 `<FormField>` 体系（shadcn Form 模式）：`Form / FormField / FormItem / FormLabel / FormControl / FormDescription / FormMessage`，声明式书写。
- 复杂控件（Select、DatePicker、Combobox、Switch、上传）统一以 `FormField` 包装。

### 8.2 规范

- 校验策略：**onChange 失焦后开始校验、onSubmit 全量校验**（`mode: "onTouched"`）。
- 异步校验（如「用户名是否占用」）用 `reactive` + 防抖，仅在该字段失焦后触发。
- 动态字段（FormArray）用 `useFieldArray`；dnd-kit 拖拽排序与之结合。
- 提交：禁用按钮 + loading，成功 Toast + 导航/关闭，失败回填字段错误。

---

## 9. 表格系统（TanStack Table）

### 9.1 通用 `<DataTable>` 封装（`components/blocks/data-table/`）

一次性封装好，业务侧只声明 **columns + 数据源**，自动获得：

- 排序（多列）、列筛选、全局搜索、分页（服务端/客户端可切换）、列显隐、列宽拖拽、密度切换、行选择、行点击、空态、加载骨架、工具栏（`DataTableToolbar`）、导出。

### 9.2 API 设计（声明式）

```tsx
const columns = columnHelper<Project>()([
  { accessorKey: "name", header: "名称", cell: ({ row }) => <NameCell {...row} /> },
  { id: "status", header: "状态", cell: StatusBadge, enableHiding: true },
  { id: "actions", cell: RowActions },
]);
<DataTable
  columns={columns}
  data={data}
  isLoading={isLoading}
  // 服务端模式
  pagination={{ mode: "server", total, onPaginationChange }}
  sorting={{ mode: "server" }}
  rowSelection
  onRowClick={(row) => router.push(`/projects/${row.id}`)}
/>;
```

### 9.3 高级能力

- **虚拟化**：行数 >500 开启 `@tanstack/react-virtual`，固定表头 + 横向滚动。
- **列拖拽**：表头用 dnd-kit 调整列顺序；列宽用原生 resize。
- **URL 同步**：分页/排序/筛选进 URL（§6.3）。

---

## 10. SaaS 业务基建

### 10.1 多租户（Workspace / Tenant）

- **租户解析**：子域名（`acme.app.com`）或路径（`/orgs/acme/...`）或会话内当前工作区。
- **工作区切换器**（顶栏）：切换后全局失效相关 Query 缓存，路由回首页。
- **数据隔离**：所有 Query Key 含 `tenantId`，切换租户天然换缓存。

### 10.2 认证与授权（RBAC / 权限）

- **认证**：会话 cookie + Middleware 守卫 + `(auth)` 路由分组。
- **授权**：
  - 定义权限矩阵（`config/permissions.ts`）：角色 × 资源 × 动作。
  - 前端**两道闸**：① 导航/按钮按权限显隐（`<Can permission="project:create">`）；② 接口由后端最终校验，前端显隐仅为体验。
  - 页面级：Server Component 内校验，无权限渲染 `403` 页或重定向。

### 10.3 计费/订阅（Billing）

- 订阅状态 → 影响功能可用性（feature gate）。
- 封装 `<FeatureGate feature="advanced-export">`：未订阅时显示「升级」引导而非直接禁用，转化漏斗。
- 用量展示（配额条）统一用 Recharts 进度/小型图。

### 10.4 国际化（i18n）

- 默认 `next-intl` 或 `next-i18n-router`（App Router 友好）。
- 文案全部走 `t()`，**禁止硬编码中文**；日期/数字/货币用 `Intl` 格式化（注意时区）。
- 设计令牌与文案解耦，支持文案长度差异（德语更长）→ 布局留弹性。

### 10.5 通知系统（Sonner + 实时）

- `Toaster` 挂在根布局，统一封装 `toast.success/error/promise`。
- 约定：成功静默（3s）、错误持久（含重试）、进行中用 `toast.promise(...)`。
- 站内实时通知（WebSocket / SSE）→ 通知中心（顶栏铃铛），未读计数。

### 10.6 命令面板（cmdk）

- 全局 ⌘K：快捷导航、搜索、执行动作（创建项目、切换主题、跳转设置）。
- 用 shadcn `Command` 封装，分组（导航/操作/最近），支持模糊搜索、键盘选择。

### 10.7 拖拽（dnd-kit）

- 看板（Kanban 列/卡片）、表单字段排序、仪表盘卡片布局、表格列顺序。
- 封装通用 `<Sortable>`：a11y（键盘可拖）、触摸支持、`prefers-reduced-motion` 降级。
- 拖拽结果乐观更新 + 失败回滚（与 TanStack Query mutation 配合）。

---

## 11. 图表系统（Recharts / ECharts）

- **默认 Recharts**：声明式、与 React/主题令牌契合（`--chart-1~5` 注入），覆盖柱/折/饼/面积/组合。
- **ECharts 用于**：大数据量（>1k 点）、复杂图（桑基/关系图/地图）、需要更细交互时。封装为 React 组件，按需懒加载（`next/dynamic`）避免首屏体积。
- 所有图表色取自令牌，随主题切换自动适配；提供暗色坐标轴/网格样式。
- **响应式**：用 `<ResponsiveContainer>`；移动端简化（隐藏图例或改为卡片）。

---

## 12. 跨切面关注点

### 12.1 错误处理与边界

- `app/error.tsx`（路由级）+ `app/global-error.tsx`（兜底，替换 `<html>`）。
- 区分：**预期业务错误**（Toast/表单回填）vs **意外错误**（错误边界 + 上报）。
- 加载：`loading.tsx` 骨架（Skeleton），与最终布局形状一致，减少 CLS。

### 12.2 监控（Sentry / 自建）

- 集成 `@sentry/nextjs`：捕获前后端错误、性能（Web Vitals）、Release 追踪。
- 关键流程加面包屑（用户/租户/动作），便于复现。

### 12.3 性能优化

- RSC 优先，减少客户端 JS。
- 路由段级 `loading` + 流式渲染（`Suspense`）。
- 大组件/库动态导入（ECharts、富文本编辑器）。
- 图片用 `next/image`；字体 `next/font`；图标按需（Lucide tree-shake）。
- TanStack Query 缓存 + 预取减少请求。
- 关注 **LCP / INP / CLS** 三大核心 Web Vitals。

### 12.4 SEO / 元数据

- SaaS 多为登录后应用，SEO 权重低；但**营销页/落地页/定价页**需用 Metadata API（`generateMetadata`）、OpenGraph、sitemap、robots。
- `app/` 根 `<html lang>` 正确；语义化结构。

---

## 13. 工程化配置

### 13.1 TypeScript

- `strict: true`、`noUncheckedIndexedAccess: true`、`paths` 别名（`@/*`）、`verbatimModuleSyntax`。
- 类型来源：API 自动生成 + Zod 推导，减少手写易错类型。

### 13.2 Lint / Format

- 推荐 **Biome**（一体化、极速）替代 ESLint+Prettier；或沿用 ESLint（`next/core-web-vitals`、`@typescript-eslint`）+ Prettier。
- 规则：禁 `any`、禁 `console.log`（除开发）、import 排序、未使用变量报错。

### 13.3 Git Hooks

- **Husky** + **lint-staged**：提交前对暂存文件 lint/format/type-check。
- **commitlint**（Conventional Commits）：`feat/fix/docs/chore/refactor/...`，便于生成 changelog。

### 13.4 测试策略

- **单元**：Vitest（工具函数、hooks、Zod schema）。
- **组件**：Vitest + Testing Library（关键 UI 组件、表单、表格交互）。
- **E2E**：Playwright（登录、核心业务流、权限、计费升级）。
- **视觉回归（可选）**：Storybook + Chromatic。
- 目标：核心流程 E2E 覆盖，工具/校验单元覆盖，不求 100%。

### 13.5 Storybook（可选但推荐）

- 为设计体系建立组件展厅，让 token/组件/状态可视化，便于设计与后端协作。

---

## 14. 安全与合规

- **XSS**：默认 React 转义；富文本用白名单 sanitizer（DOMPurify）；避免 `dangerouslySetInnerHTML`。
- **CSRF**：依赖 cookie 认证时启用 CSRF token 或 SameSite。
- **敏感数据**：token 走 HttpOnly cookie；前端不存明文密钥；API key 展示掩码。
- **越权**：前端显隐仅体验，后端兜底（IDOR 由后端防）。
- **审计日志**：关键操作（成员/权限/计费变更）走后端审计。
- **合规**：根据业务预留 GDPR/数据驻留开关；Cookie 同意（若面向欧盟）。

---

## 15. 实施路线图（分阶段）

| 阶段              | 周期      | 交付                                                                                                  |
| ----------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| **P0 地基**       | 第 1 周   | 工程脚手架：Next.js + TS + Tailwind v4 + ESLint/Biome + Husky；目录结构；`cn()`                       |
| **P1 设计体系**   | 第 1–2 周 | globals.css 全套令牌（色彩/排版/间距/圆角/阴影/动效/z-index）；next-themes；暗色；基础 `ui/` 组件落地 |
| **P2 应用骨架**   | 第 2–3 周 | AppShell（Rail+Panel+Topbar）、路由分组、Middleware 守卫、next-themes、Sonner、cmdk                   |
| **P3 数据与请求** | 第 3–4 周 | apiClient + 错误体系 + Query Key 工厂 + TanStack Query Provider + RSC hydration                       |
| **P4 复合能力**   | 第 4–5 周 | `<DataTable>`、表单体系（RHF+Zod）、权限 `<Can>`、空态/加载态规范                                     |
| **P5 SaaS 能力**  | 第 5–7 周 | 多租户切换、RBAC、计费 FeatureGate、i18n、通知中心、dnd-kit 封装                                      |
| **P6 质量保障**   | 第 7–8 周 | Vitest + Playwright、Sentry、Storybook、性能基线                                                      |
| **P7 持续演进**   | 滚动      | ADR 记录、文档维护、组件/令牌治理                                                                     |

---

## 16. 关键决策记录（ADR 摘要）

| #   | 决策          | 选择                                    | 理由                                            |
| --- | ------------- | --------------------------------------- | ----------------------------------------------- |
| 1   | Tailwind 版本 | **v4**                                  | CSS-first、`@theme` 原生令牌、OKLCH、免双轨维护 |
| 2   | 色彩空间      | **OKLCH**                               | 感知均匀、暗色可控、广色域                      |
| 3   | 组件库        | **shadcn/ui 拷贝式**                    | 代码自有、深度可控、不锁版本                    |
| 4   | 状态管理      | **TanStack Query + URL + 少量 Context** | 拒绝全局 store 反模式                           |
| 5   | 表格          | **TanStack Table + 自封 DataTable**     | headless 灵活、虚拟化                           |
| 6   | 业务代码组织  | **features/ 特性内聚**                  | 长期可删除、可演进                              |
| 7   | 类型来源      | **OpenAPI 生成 + Zod 推导**             | 契约单一事实源                                  |
| 8   | Lint/Format   | **Biome（推荐）**                       | 一体化、快                                      |

---

## 附录 A：核心令牌速查（可直接粘贴进 globals.css）

见 §4.1.1 / §4.1.5 / §4.1.6 / §4.1.7，组合即为完整 token 集。

## 附录 B：依赖清单（package.json 概览）

```jsonc
{
  "dependencies": {
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    // 样式
    "tailwindcss": "^4.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    // 组件原语（按需安装）
    "@radix-ui/react-*": "...",
    "cmdk": "^1.x",
    "sonner": "^1.x",
    "next-themes": "^0.4.x",
    "lucide-react": "latest",
    // 数据/表单/表格
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-table": "^8.x",
    "@tanstack/react-virtual": "^3.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    // 动画/拖拽/图表/URL
    "motion": "^11.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "recharts": "^2.x",
    "echarts": "^5.x",
    "nuqs": "^latest",
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@biomejs/biome": "^1.x", // 或 eslint + prettier
    "vitest": "^2.x",
    "@playwright/test": "^1.x",
    "husky": "^9.x",
    "lint-staged": "^15.x",
    "@commitlint/cli": "^19.x",
  },
}
```

---

> **下一步建议**：确认本方案后，可按 P0→P1 直接落地。我可以立即生成：① 完整工程脚手架（含 `globals.css` 全套令牌、`tsconfig`、`next.config`、`components.json`）；② 应用骨架与基础 `ui/` 组件；③ `DataTable` / 表单体系模板。告知即可开工。
