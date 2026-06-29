# gc-Console

> B 端 SaaS 管理后台的**前端基建**（非一次性 demo）。建立「设计体系 + 工程骨架 + 业务能力底座」，使后续业务模块能按约定快速组装。基于 Next.js 16 App Router。

当前处于**脚手架 / 基座阶段**：设计令牌、应用骨架、请求层、权限闸、TanStack Query、Zod 表单、数据表格已就位；真实鉴权后端、图表 / 拖拽 / i18n 等为后续规划。权威设计文档见 [`docs/technical-solution.md`](docs/technical-solution.md)。

> 协作规范（项目概述、技术栈、命令、架构、约定、注意点）沉淀在 [`AGENTS.md`](AGENTS.md)；本文件聚焦**如何把项目跑起来与交付部署**。

## 技术栈

| 领域 | 选择 |
| --- | --- |
| 框架 | Next.js 16.2.9（App Router；`proxy.ts` 取代 middleware） |
| 语言 | TypeScript 5（strict + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`） |
| 运行时 | React 19、Node ≥ 20.9 |
| 样式 | Tailwind CSS v4（CSS-first；令牌写在 `src/app/globals.css` 的 `@theme`） |
| 组件 | shadcn/ui（new-york）+ radix-ui |
| 数据 | TanStack Query v5（SSR-safe）、TanStack Table v8 |
| 校验 | Zod v4（表单与接口共用单一 schema） |
| 动画 | Motion（`motion/react`） |
| 包管理 | **bun**（`bun.lock` 为依赖单一事实源） |
| Lint / Format | oxlint + oxfmt（非 ESLint / Prettier） |
| 测试 | Vitest |

## 前置要求

- **Node.js ≥ 20.9**（Next 16 硬性要求）
- **bun ≥ 1.3**

## 快速开始

```bash
bun install          # 装依赖
bun run dev          # 启动开发服务器（next dev）
```

打开 [http://localhost:3000](http://localhost:3000)。

**开发期登录**：脚手架内置鉴权桩，登录页输入**任意非空**用户名 + 密码即可进入；未设 `NEXT_PUBLIC_API_BASE_URL` 时，请求回落到同源 `/api` mock（进程重启即重置）。

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需修改：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | 否（有默认） | 站点绝对地址；服务端解析同源 mock、生成元数据用。默认 `http://localhost:3000` |
| `NEXT_PUBLIC_API_BASE_URL` | 否 | 真实后端基地址（含前缀，如 `https://api.example.com`）。**不设** → 开发期回落同源 `/api` mock；设置 → 客户端零改动切真实后端 |
| `AUTH_SECRET` | **生产必填** | 会话 cookie 的 HMAC 签名密钥。dev 有内置默认值免配置；**生产必须设为强随机值**（`openssl rand -base64 32`），否则首个鉴权请求 fail-loud |

> `NEXT_PUBLIC_*` 在**构建期**内联进客户端 bundle（Docker 构建时作 `--build-arg` 传入）；`AUTH_SECRET` 是**运行期**服务端变量。

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `bun run dev` | 启动开发服务器 |
| `bun run build` | 生产构建 ⚠️ 是 `bun run build`，**不是** `bun build`（后者是 bun 自带打包器，会报 "Missing entrypoints"） |
| `bun run start` | 生产模式启动（需先 `build`） |
| `bun run typecheck` | `tsc --noEmit` 类型检查 |
| `bun run lint` / `lint:fix` | oxlint 检查 / 自动修复 |
| `bun run format` / `format:check` | oxfmt 格式化 / 校验 |
| `bun run test` / `test:run` / `test:watch` | Vitest 测试 |

提交时 Husky 自动：`pre-commit` 跑 lint-staged（`oxlint --fix` + `oxfmt --write`），`commit-msg` 跑 commitlint（Conventional Commits：`feat/fix/docs/chore/refactor/...`）。

## 生产部署

### 方式一：Node 直跑

```bash
bun run build                         # 产出 .next（standalone 输出）
bun run start                         # next start，默认监听 3000
PORT=3000 HOSTNAME=0.0.0.0 bun run start   # 自定义端口 / 主机
```

生产环境务必设置 `AUTH_SECRET`。

### 方式二：Docker（推荐）

镜像基于 Next.js **standalone** 输出，多阶段构建（bun 编译 → `node:22-alpine` 运行），最终镜像仅含最小运行依赖、以非 root 用户运行。完整说明见 [`deploy/`](deploy/)。

```bash
# 构建（上下文须为仓库根）
docker build -f deploy/Dockerfile -t gc-console:latest \
  --build-arg NEXT_PUBLIC_APP_URL=https://console.example.com .
  # 接真实后端再加：--build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com

# 运行（AUTH_SECRET 运行期必填）
docker run -d -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  --name gc-console gc-console:latest
```

或用 compose 一键（见 [`deploy/docker-compose.yml`](deploy/docker-compose.yml)）：

```bash
cd deploy
AUTH_SECRET=$(openssl rand -base64 32) docker compose up -d --build
```

### 上线检查清单

- [ ] 设置 `AUTH_SECRET`（强随机值）
- [ ] `NEXT_PUBLIC_APP_URL` 指向真实站点地址（构建期）
- [ ] 接真实后端：设 `NEXT_PUBLIC_API_BASE_URL`，并把后端域名加入 `next.config.ts` 的 CSP `connect-src`（否则跨域 fetch 被拦）
- [ ] 反向代理终结 HTTPS，并转发 `Host`、`X-Forwarded-Proto`（HSTS / 绝对 URL 方向正确）

## 项目结构

```
src/
├── app/                # 路由层（App Router）
│   ├── (auth)/         #   未登录页（login / register，独立布局）
│   ├── (dashboard)/    #   已登录主应用（套 AppShell）
│   └── api/projects/   #   开发期同源 mock（接真实后端后整目录可删）
├── components/         # ui（shadcn 原子）/ blocks（业务复合）/ layout（骨架）/ providers
├── config/             # 导航 / RBAC 权限矩阵 / 计费特性 / 站点元信息
├── features/           # 特性模块（自包含；projects 为参考模板）
│   └── projects/       #   api / schemas / types / query-keys / hooks / components
├── lib/                # 基础设施：api / auth / env / table / form / toast ...
└── proxy.ts            # Next 16 边缘代理（原 middleware）：认证守卫
```

**核心约定**：RSC-first、设计令牌为单一视觉事实源（只用语义令牌）、URL 即状态、Zod 为单一事实源、权限前后端两道闸。详见 [`AGENTS.md`](AGENTS.md)。

## 文档

- [`AGENTS.md`](AGENTS.md) — 协作规范（架构、约定、注意点的单一事实源）
- [`docs/technical-solution.md`](docs/technical-solution.md) — 权威技术方案（代码注释里的 `§4.4` 等章节号指向它）
- [`deploy/`](deploy/) — 生产构建与 Docker 部署
