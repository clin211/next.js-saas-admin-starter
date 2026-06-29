---
name: feature-blueprint
description: next.js-saas-admin-starter 项目里新建功能模块、页面、组件或路由时的工程规范与脚手架指南。覆盖 RSC vs 'use client' 的边界、SSR/CSR/SSG/ISR 怎么选、features/<x> 模块怎么搭、组件如何按「职责单一 / 职责分离 / 逻辑与 UI 分离」拆分、每个路由段必须配 loading/error/not-found 三件套、图示如何用 undraw 并贴合亮暗主题。当用户提到「新增 / 实现 / 做一个功能 / 模块 / 页面 / 组件」「加一个 CRUD」「做一个表格 / 表单 / 详情页」「新建 xxx 管理」「在仪表盘加卡片 / 统计」「做一个公开落地页 / 定价页」，或要求「按规范来」「符合最佳实践」「用 SSR/SSG/ISR 优化」时，都应使用这个 skill。即使用户没明说「按规范」，只要是在 next.js-saas-admin-starter 里写新代码，也应优先参考它，以保证模块结构、渲染边界、路由三件套与设计令牌的一致性。
---

# feature-blueprint — next.js-saas-admin-starter 新功能 / 组件建造指南

> 你现在在 next.js-saas-admin-starter（Next.js 16 App Router 的 B 端 SaaS 管理后台基座）里写**新代码**。这个 skill 不是科普 Next.js，而是告诉你：**怎么顺着项目已有的约定往下长**，让新东西在性能、稳定性、一致性三方面都站得住。

## 这个 skill 解决什么

next.js-saas-admin-starter 已经沉淀了一套约定（`features/` 特性模块、RSC-first、Zod 单一事实源、语义令牌、TanStack Query + `<HydrateBoundary>`、`<Can>` 权限闸、URL 即状态）。新功能要**接着这套约定生长**，而不是各写各的。本 skill 给你三样东西：

1. **决策框架** —— 遇到分叉（该用 Server 还是 Client？SSR 还是 SSG？这块逻辑放哪？）时怎么判断；
2. **不变量** —— 无条件遵守、违反就埋雷的少数几条；
3. **脚手架** —— 重复劳动（路由三件套、undraw 着色）用脚本一键产出。

目标就三个词：**性能**（用对渲染模式、少发客户端 JS、不重复请求）、**稳定**（错误有边界、加载有骨架、404 有兜底）、**一致**（结构 / 令牌 / 权限 / 状态归属统一）。

---

## 三条不变量（先内化，再写代码）

### 1. RSC-first + 数据单向流

默认写 Server Component。首屏数据在 RSC 里 `await` 取 → `prefetchQuery` + `<HydrateBoundary>` 注入 → 客户端 TanStack Query 接管增删改与重新验证。

**绝不要**出现「服务端取一次、客户端又取一次」的双取。判据：页面里既在 RSC 顶层 `fetch`，又在子组件里 `useQuery` 拉同一条数据却没有 `<HydrateBoundary>` 兜底 —— 这就是双取。`getQueryClient()` 已经做成 SSR-safe（服务端每请求新建、浏览器单例），`HydrateBoundary` 配合它的 `dehydrate.shouldDehydrateQuery` 会把 pending 查询也序列化，首屏零闪烁。

### 2. Zod schema 是唯一事实源

字段约束**定义一次**（`schemas.ts`）→ `z.infer` 推出 TS 类型（`types.ts` 复用，不手写重复结构）→ 驱动 RHF 表单校验（`zodResolver`）→ 复用为接口入参校验。**禁止**「前端放行、后端拒绝」的两套校验。

### 3. 语义令牌是唯一视觉事实源

只用语义类：`bg-card`、`text-muted-foreground`、`border`、`bg-primary`……**禁止**写死 hex，也**禁止**直接用 `--gray-*` 这类原始值。所有视觉值定义在 `globals.css` 的 `@theme`（OKLCH），亮 / 暗主题靠令牌自动切换 —— 你写 `text-muted-foreground`，暗色下自动变浅，不用你管。

> 为什么：令牌是「视觉的事实源」。一旦某处写死颜色，主题切换、多租户换肤、无障碍对比度校验都会漏掉它，技术债从这里开始。

更多「为什么」与反模式见 `references/`。

---

## 工作流：建一个新东西，按这六步走

### 第 0 步 · 先界定你要建的是哪一类（决定后面所有决策）

```
是一整个业务能力（有数据、有 CRUD、有多视图）？
  → Feature 模块  features/<x>/          详见 references/feature-module.md
是一块跨 feature 复用的复合展示/交互（DataTable、FormBuilder）？
  → 区块组件      components/blocks/
是一个原子控件（按钮、输入、下拉）？
  → UI 组件       components/ui/（shadcn 拷贝式，归项目所有）
是应用骨架/导航布局？
  → components/layout/ + config/nav.ts
是单个页面？
  → app/(dashboard)/<x>/page.tsx + 三件套
```

### 第 1 步 · 选渲染模式（性能的关键）

精简决策表（完整版 + 代码示例见 `references/rendering-modes.md`）：

| 场景                                             | 模式                | 在本项目怎么落                                         |
| ------------------------------------------------ | ------------------- | ------------------------------------------------------ |
| 登录后的管理页（个性化、鉴权）                   | **SSR**（动态 RSC） | `page.tsx` 里 `await` 取数，默认动态渲染               |
| 公开且稳定（登录页、营销落地页）                 | **SSG**             | 无动态依赖即可静态；多路由用 `generateStaticParams`    |
| 公开且周期更新（定价、更新日志、博客）           | **ISR**             | `fetch` 的 `next.revalidate` 或段级 `revalidate`       |
| SSR 外壳里的高交互岛（表格主体、表单、命令面板） | **CSR island**      | 子组件加 `'use client'`，数据经 `HydrateBoundary` 注入 |

**三条经验法则（违反必踩坑）：**

- **「需要登录」≈ 动态 SSR**。别给 Console 页用 SSG/ISR —— 缓存里装的是别人的数据，会串租户、越权。`proxy.ts` 已做认证守卫，受保护页面天然动态。
- **把「交互」压进小岛**。外壳（PageHeader、布局、文案）保持 Server，只让真正需要状态/事件的子树升 `'use client'`。发出去的 JS 越少，INP 越好。
- **重库按需加载**。图表（Recharts/ECharts，尚未引入）、富文本编辑器用 `next/dynamic(() => ..., { ssr: false })`，别让它进首屏 bundle。**另一条等价路径**：简单图（折线/柱状/环形）完全可以用零依赖的内联 SVG（颜色走 `var(--chart-1)` 语义令牌）——在脚手架阶段尚未引入图表库时，这比「先装 Recharts 再 dynamic」更轻、更省依赖。两条路任选其一，目标是同一个：**别让重库进首屏 bundle**。

> 注意一个项目缺口：`apiClient` 当前没显式给 `next` 选项做类型，但 `request()` 会把 `...rest` 透传给 `fetch`，所以运行时 `apiClient.get('/x', { next: { revalidate: 60, tags: ['x'] } })` 是生效的。需要类型干净时，给 `RequestOptions` 补 `next?: NextFetchRequestConfig`（别绕过它自己 fetch）。

### 第 2 步 · 搭 Feature 模块骨架（数据先行）

落盘顺序就是依赖顺序，自下而上：

```
schemas.ts  →  types.ts  →  constants.ts  →  api.ts  →  query-keys(qk)  →  hooks/  →  components/  →  index.ts  →  route/page.tsx
```

`features/projects/` 是现成模板，**照抄它的形态**。要点：

- **`api.ts`** 走 `apiClient`（已统一 baseURL / `credentials:'include'` / 错误归一化 `ApiError.fromResponse`）。需要缓存时透传 `next`（见上）。
- **`query-keys.ts`** 在 `qk` 工厂里加一段，按「层级 + 参数」构造（`all → lists → list(params) → details → detail(id)`），这样失效时能按维度 `invalidateQueries({ queryKey: qk.x.lists() })`。
- **`hooks/`** 把「取数 / 变更」（`useXxx`，封装 `useQuery`/`useMutation`）与「表单逻辑」（`useXxxForm`，RHF + `zodResolver`）**各自单独成文件** —— 这是逻辑与 UI 分离的第一道关。

完整模板（含每个文件该长什么样）见 `references/feature-module.md`。

### 第 3 步 · 拆组件（三大原则）

| 原则               | 一句话                                                     | 判据                                                                                |
| ------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **职责单一**       | 一个组件只做一件事：渲染、或交互、或取数容器，三者择一     | 文件名能准确描述它干啥，不需要「和」字                                              |
| **职责分离**       | 容器（取数/编排）与展示（纯渲染）分层                      | `page.tsx` 是容器，向下传 props；不在一个文件里 fetch + format + render 全干        |
| **逻辑与 UI 分离** | 副作用/状态/数据变换进自定义 hook；组件只「接数据 → 渲染」 | 一个 `.tsx` 里若同时有 `useQuery` 和一大片排版 JSX，就把 `useQuery` 抽成 `useXxx()` |

组件规范（来自 AGENTS.md，务必遵守）：变体用 `cva`（别内联 className）；交互组件**四态齐全**（默认 / hover / focus-visible / disabled）；所有 UI 组件 `forwardRef`；优先原生语义标签与 Radix 行为原语，**别用 `div + onClick` 冒充按钮**。

更多反例与重构示范见 `references/component-anatomy.md`。

### 第 4 步 · 路由层（每个段都要有三件套）

每个路由段（至少每个「页面级」段）**必须**配齐：

| 文件            | 作用                 | 关键点                                                                                   |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `page.tsx`      | RSC，首屏取数 + 装配 | `prefetchQuery` + `<HydrateBoundary>` 包容器组件；导出 `metadata`（title）               |
| `loading.tsx`   | 路由段骨架           | 与最终布局**同形**，减少 CLS；用 `Skeleton`                                              |
| `error.tsx`     | 路由级错误边界       | 给 `reset` 重试按钮；区分**预期业务错误**（toast / 表单回填）vs **意外错误**（边界兜底） |
| `not-found.tsx` | 该段 404 兜底        | 详情页查不到记录时主动 `notFound()`，落到这里                                            |

**别手写三件套** —— 用脚本：

```bash
node .claude/skills/feature-blueprint/scripts/scaffold-route.mjs "src/app/(dashboard)/members"
```

它会按项目现有风格（语义令牌、`Skeleton`、`Button`、中文注释）生成 `loading.tsx` / `error.tsx` / `not-found.tsx`，并留好 undraw 插画的接入位。

**关于图示（undraw）**：404 / 空状态 / 出错页鼓励配图，但必须**语义贴合 + 跟随主题**。优先用自动拉取脚本（**免手工到 undraw.co 下载**）：

1. **一键拉取 + 着色 + 出组件**（推荐）：
   ```bash
   # 别名（next.js-saas-admin-starter 常用场景预设）：error-404 / error-401 / error-403 / error-500 / error-503 / empty
   node .claude/skills/feature-blueprint/scripts/fetch-undraw.mjs error-404 \
     --component src/components/illustrations/error-404.tsx --out public/illustrations/error-404.svg
   # 关键词拉取：node ...fetch-undraw.mjs lost   浏览镜像：node ...fetch-undraw.mjs --list server
   ```
   脚本从两个 undraw 镜像拉 SVG → 把主色转 `currentColor` → 生成可直接 `import` 的**内联组件**（`<img>` 不支持 `currentColor`，故必须内联）。镜像：`cuuupid/undraw-illustrations`（主色 `#6c63ff`）、`balazser/undraw-svg-collection`（主色 `var(--primary-svg-color)` + 深灰族，auth 类更全）。每个别名已挑好语义最贴合的镜像与插画（如 401 → balazser 的 `fingerprint-login`）。
2. 选**语义对得上**的图（404 → 「迷失/找不到」类；空状态 → 「空盒/开箱」类；出错 → 「维修/报错」类），别随便塞张好看的图。镜像只是 undraw 的子集，命中多个时脚本会列出让用 `--exact` 挑。
3. 组件用语义文字色驱动：`<Error404Illustration className="w-64 text-primary" />` —— 亮 / 暗主题自动切换、与品牌一致；尺寸随 `w-*` 改。
4. 手工路径（已有本地 SVG 时）：用 `undraw-recolor.mjs` 着色，再同上做成内联组件。

### 第 5 步 · 权限与状态归属

- **权限两道闸**：导航 / 按钮用 `<Can permission="...">` 显隐（仅为体验）；**后端做最终校验**防 IDOR。新增资源动作时，在 `config/permissions.ts` 的 `Permission` 联合类型 + `permissionMatrix` 里加项，并在 `config/nav.ts` 的 `NavItem.permission` 上挂。
- **URL 即状态**：列表的搜索 / 筛选 / 分页 / 排序 / Tab 一律进 URL（`useSearchParams` + `router`），刷新可保留、可分享、前进后退生效。判据：刷新页面后筛选丢了 → 说明状态没进 URL。
- **状态归属**（别用全局 store 装所有数据）：服务端数据 → TanStack Query；表单临时态 → RHF；URL 状态 → URL；全局 UI 态 → Context。

---

## 收尾检查清单（Definition of Done）

提交 / 收工前逐条对照：

- [ ] `bun run typecheck` 过、`bun run lint` 过（项目处于脚手架阶段，桩很多，**别假设有效，跑了再说**）
- [ ] RSC-first：只在「用 hooks / 浏览器 API / 仅客户端库 / 高交互」时才加 `'use client'`
- [ ] 无双取：首屏 `prefetchQuery` + `<HydrateBoundary>`
- [ ] Zod schema 单一定义，TS 类型由它推导
- [ ] 只用语义令牌，零写死颜色 / 原始灰阶
- [ ] 该路由段有 `loading` + `error` + `not-found`（用 `scaffold-route.mjs`）
- [ ] 交互组件四态齐全、`forwardRef`、`cva` 变体；无 `div + onClick` 冒充按钮
- [ ] 列表状态在 URL；受控入口用 `<Can>`
- [ ] 重库 `dynamic` 导入；图片 `next/image`、字体 `next/font`
- [ ] 中文注释 + 英文代码，密度对齐周边文件（项目是双语风格）

---

## 何时读哪个参考（按需加载，别一次全读）

- **`references/rendering-modes.md`** —— 选 SSR/CSR/SSG/ISR、写 RSC 取数 / 缓存 / 失效、做公开静态页时。含本项目 `apiClient` + `qk` + `getQueryClient` 的真实代码范式。
- **`references/component-anatomy.md`** —— 拆组件、判断某子树该不该 `'use client'`、做容器/展示分层时。含「单体组件 → 拆分」的重构示范。
- **`references/feature-module.md`** —— 搭一个全新 feature 模块时。含 `members` 模块每个文件的完整模板与 nav/permission 注册。

## 脚本

- **`scripts/scaffold-route.mjs <route-dir> [--force] [--home /dashboard]`** —— 生成路由三件套。
- **`scripts/fetch-undraw.mjs <query|alias> [--component path.tsx] [--out path.svg] [--list kw] [--exact file]`** —— 从 undraw 镜像自动拉取插画 → 着色 → 生成内联组件（免手工下载）。别名：`error-404/401/403/500/503`、`empty`；也可按关键词搜。
- **`scripts/undraw-recolor.mjs <input.svg> [--from #6c63ff] [--out out.svg]`** —— undraw 插画主色 → `currentColor`，使其跟随主题（`fetch-undraw` 内部复用它；也导出 `recolorSvg` 供脚本间复用）。

---

> 写新代码时，**默认照这套来**；只有当你能说清「为什么这里要破例」时才偏离，并在代码注释里写下理由。
