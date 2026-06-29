# 组件拆分原则（职责单一 / 职责分离 / 逻辑与 UI 分离）

> 配合 `SKILL.md` 第 3 步使用。心法：**一个组件只做一件事；容器管数据、展示管渲染；逻辑进 hook、组件只画界面。**

## 目录
- [分层：每类组件住在哪](#分层每类组件住在哪)
- [原则一：职责单一](#原则一职责单一)
- [原则二：职责分离（容器 vs 展示）](#原则二职责分离容器-vs-展示)
- [原则三：逻辑与 UI 分离](#原则三逻辑与-ui-分离)
- [重构示范：单体 → 分层](#重构示范单体--分层)
- [组件规范细则](#组件规范细则)
- [反模式](#反模式)

---

## 分层：每类组件住在哪

| 角色 | 目录 | 渲染 | 职责 | 例 |
| --- | --- | --- | --- | --- |
| 页面 | `app/.../page.tsx` | Server（容器） | 取数、装配、SEO metadata | `members/page.tsx` |
| 特性容器 | `features/<x>/components/` | 多为 Server | 编排该特性的子组件、下传 props | `<MembersPage>` |
| 特性展示 | `features/<x>/components/` | 按需 Client | 该特性的纯交互/纯渲染件 | `<MembersTable>` `<MemberForm>` |
| 区块（跨特性复用） | `components/blocks/` | 多为 Server | 复合业务件 | `<PageHeader>` `<EmptyState>` `<DataTable>` |
| UI 原子 | `components/ui/` | 按需 | shadcn 拷贝式原子控件 | `<Button>` `<Input>` |
| 布局骨架 | `components/layout/` | 混合 | AppShell / Rail / Topbar 等 | `<AppShell>` |

**判据**：这块东西**只服务于一个业务能力** → `features/<x>/`；**会被多个 feature 复用** → `components/blocks/`（业务语义）或 `components/ui/`（原子）。

---

## 原则一：职责单一

一个组件只做**一件事**。给它一个名字时不需要「和」字。

- ✅ `<MembersTable>`：只渲染成员表格。
- ✅ `<MemberForm>`：只处理成员表单字段。
- ✅ `<MembersToolbar>`：只管搜索/筛选的 URL 状态。
- ❌ `<MembersSection>` 同时：取数 + 格式化 + 渲染表格 + 渲染表单 + 管弹窗 —— 名字里全是隐含的「和」。

**信号**：一个组件超过 ~150 行、import 超过 ~12 个、或一个文件里出现多个不相关的 `useState` 簇 —— 大概率该拆。

---

## 原则二：职责分离（容器 vs 展示）

把「**拿什么数据、怎么编排**」和「**长什么样**」分开：

- **容器**（Container）：取数 / 鉴权 / 装配 / 向下传 props。**不关心**视觉细节。本项目里通常是 `page.tsx` 或 `features/<x>/components/xxx-page.tsx`。
- **展示**（Presentational）：纯函数式地 `props → JSX`。**不关心**数据从哪来。容易测试、容易在 Storybook 里单独看。

```tsx
// ✅ 容器：管数据与装配（Server）
// features/members/components/members-page.tsx
import { MembersToolbar } from "./members-toolbar";
import { MembersTable } from "./members-table";

export function MembersPage({ page, q }: { page: number; q: string }) {
  return (
    <div className="space-y-6">
      <MembersToolbar q={q} />
      <MembersTable page={page} q={q} />
    </div>
  );
}

// ✅ 展示：只渲染（Client，因为要交互/读缓存）
// features/members/components/members-table.tsx
export function MembersTable({ page, q }: { page: number; q: string }) {
  const { data } = useQuery({ /* … */ });
  return <table>{/* … */}</table>;
}
```

> 注意：容器不一定是 Server、展示不一定是 Client。**「容器 vs 展示」是职责维度，「Server vs Client」是渲染维度**，别混为一谈。一个展示件若需要交互就得 `'use client'`；一个容器若只编排 Server 子件就可以保持 Server。

---

## 原则三：逻辑与 UI 分离

**副作用、状态、数据变换进自定义 hook；组件只「接数据 → 渲染」。**

判据：一个 `.tsx` 里**同时**有 `useQuery`/`useMutation`/复杂 `useEffect` **和**一大片排版 JSX —— 把那段逻辑抽成 `useXxx()`。

```tsx
// ❌ 逻辑与 UI 缠在一起
"use client";
export function MembersTable({ page, q }: Props) {
  const { data, isFetching } = useQuery({
    queryKey: qk.members.list({ page, q }),
    queryFn: () => membersApi.list({ page, pageSize: 20, search: q }),
  });
  const [selected, setSelected] = useState<string[]>([]);
  // …还有筛选/排序/分页的一堆逻辑……
  return <table>{/* 200 行 JSX */}</table>;
}

// ✅ 逻辑进 hook
// features/members/hooks/use-members.ts
export function useMembersList(page: number, q: string) {
  return useQuery({
    queryKey: qk.members.list({ page, q }),
    queryFn: () => membersApi.list({ page, pageSize: 20, search: q }),
    placeholderData: (prev) => prev,
  });
}
export function useMembersSelection() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return { selected, toggle, clear: () => setSelected([]) };
}

// features/members/components/members-table.tsx —— 组件瘦下来，只渲染
"use client";
export function MembersTable({ page, q }: Props) {
  const { data, isFetching } = useMembersList(page, q);
  const { selected, toggle } = useMembersSelection();
  return <table>{/* 纯 JSX */}</table>;
}
```

**好处**：hook 可单独测、可在多个组件复用、组件文件一眼看清它在画什么。`features/projects/hooks/` 目录就是为此预留的。

---

## 重构示范：单体 → 分层

一个常见的新手产物（全堆在 page 里）：

```tsx
// ❌ app/(dashboard)/members/page.tsx —— 全干
"use client";
export default function Page() {
  const [items, setItems] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch(`${API}/members?q=${q}`).then((r) => r.json()).then(setItems); // 绕过 apiClient
  }, [q]);
  const router = useRouter();
  // …100 行表格 + 表单 + 弹窗……
}
```

问题：整页 Client、绕过 apiClient/TanStack Query、状态没进 URL、无三件套、逻辑 UI 缠绕。

拆成分层（目标态）：

```
app/(dashboard)/members/
├── page.tsx              # Server 容器：prefetchQuery + HydrateBoundary + <MembersPage>
├── loading.tsx          # 骨架（scaffold-route.mjs 生成）
├── error.tsx            # 路由边界
└── not-found.tsx        # 段级 404

features/members/
├── schemas.ts           # memberSchema（Zod 单一事实源）
├── types.ts             # Member / MemberListParams（z.infer + 列表参数）
├── constants.ts         # 状态标签、列定义
├── api.ts               # membersApi（走 apiClient）
├── hooks/
│   ├── use-members.ts       # useMembersList / useCreateMember / useUpdateMember / useDeleteMember
│   └── use-member-form.ts   # RHF + zodResolver
├── components/
│   ├── members-page.tsx     # 容器：编排
│   ├── members-toolbar.tsx  # 展示：搜索/筛选（URL 状态）
│   ├── members-table.tsx    # 展示：表格（Client，读缓存）
│   └── member-form.tsx      # 展示：表单字段（Client）
└── index.ts              # barrel 出口
```

每个文件的完整内容模板见 `feature-module.md`。

---

## 组件规范细则

来自 AGENTS.md「关键约定」，写新组件时对照：

1. **变体用 `cva`**，不内联 className：把 size/variant 抽成 `cva([...])` 配置，调用方传 `variant="destructive"` 而非 `className="bg-destructive ..."`。
2. **四态齐全**：每个交互组件具备 **默认 / hover / focus-visible / disabled**。尤其别漏 `focus-visible:` —— 键盘可达性靠它。
3. **`forwardRef`**：所有 UI 组件 forward ref，方便父级聚焦/测量。
4. **语义标签 + Radix 行为原语**：要按钮就用 `<button>`（或 `Button asChild` + `<Link>`），**别 `div + onClick`**（不可达、无焦点环、a11y 全废）。要弹层用 `Dialog`/`Popover`，别自己拿 fixed 定位手搓。
5. **只用语义令牌**（见不变量 3）。

---

## 反模式

- ❌ `div + onClick` 冒充按钮 / 链接 / 标签页。
- ❌ 整页 `'use client'` 只为用一处 state（抽小岛）。
- ❌ 一个文件里 fetch + format + render + 弹窗全干（拆容器/展示 + 抽 hook）。
- ❌ 客户端组件里直接 `fetch`，绕过 `apiClient` / TanStack Query。
- ❌ 把「可复用的业务件」写进某个 feature 里不抽出来（应升到 `components/blocks/`）。
- ❌ 用全局 store（Zustand/Context）装服务端数据 —— 服务端数据归 TanStack Query。
- ❌ 内联 `style={{ color: '#fff' }}` 或 `className="bg-[#fff]"` —— 走语义令牌。
- ❌ prop drilling 超过 2 层还不抽 hook 或局部 Context（注意：UI 局部 Context 可以；全局数据 store 不行）。
