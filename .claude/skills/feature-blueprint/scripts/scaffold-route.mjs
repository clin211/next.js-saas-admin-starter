#!/usr/bin/env node
// scaffold-route.mjs
// -----------------------------------------------------------------------------
// 为一个路由段一键生成 loading.tsx / error.tsx / not-found.tsx 三件套。
// 用法：
//   node scaffold-route.mjs <route-dir> [--force] [--home /dashboard]
// 例：
//   node scaffold-route.mjs "src/app/(dashboard)/members"
//
// 设计原则（见 feature-blueprint SKILL.md 第 4 步）：
//   - loading 骨架与最终布局同形，减 CLS
//   - error 是路由级边界，保留外层布局，给「重试」
//   - not-found 是段级 404 兜底（详情页 notFound() 落到这里）
//   - 只用语义令牌（bg-card / border / text-muted-foreground），零写死颜色
//   - 预留 undraw 插画接入位（用 undraw-recolor.mjs 着色后内联）
// -----------------------------------------------------------------------------

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  console.log(`用法: node scaffold-route.mjs <route-dir> [--force] [--home /dashboard]

  <route-dir>   目标路由段目录，如 "src/app/(dashboard)/members"
  --force       覆盖已存在的文件（默认跳过）
  --home <path> not-found 的「返回」链接（默认按路由分组推断）`);
  process.exit(args.length === 0 ? 1 : 0);
}

const routeDir = resolve(args[0]);
const force = args.includes("--force");
const homeIdx = args.indexOf("--home");
const explicitHome = homeIdx !== -1 ? args[homeIdx + 1] : undefined;

// 推断「返回首页」链接：dashboard → /dashboard，auth → /login，其余 → /
function inferHome(dir) {
  if (explicitHome) return explicitHome;
  if (dir.includes("(dashboard)")) return "/dashboard";
  if (dir.includes("(auth)")) return "/login";
  return "/";
}
const home = inferHome(routeDir);

const LOADING = `import { Skeleton } from "@/components/ui/skeleton";

/**
 * 路由段加载骨架。与最终页面布局同形，减少 CLS（布局抖动）。
 * §12.1 / feature-blueprint 第 4 步
 */
export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
`;

const ERROR = `"use client";

import { Button } from "@/components/ui/button";

/**
 * 路由段错误边界（保留外层布局）。提供「重试」。
 * 区分预期业务错误（toast / 表单回填）与意外错误（此处兜底）。§12.1
 *
 * 想配 undraw 插图：选「维修/报错」类语义图，按 feature-blueprint 第 4 步
 * 用 undraw-recolor.mjs 着色为 currentColor，再把内联 SVG 放到下方占位处。
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      {/* <ErrorIllustration className="size-40 text-primary" /> */}
      <h1 className="text-h2 font-semibold tracking-tight">出错了</h1>
      <p className="text-small text-muted-foreground">页面加载遇到问题，请重试。</p>
      <Button onClick={reset}>重试</Button>
    </div>
  );
}
`;

const NOT_FOUND = `import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * 段级 404。详情页查不到记录时主动调用 notFound() 落到这里。
 *
 * 想配 undraw 插图：选「迷失/找不到」类语义图，着色为 currentColor 后内联到占位处。
 * feature-blueprint 第 4 步
 */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      {/* <NotFoundIllustration className="size-40 text-muted-foreground" /> */}
      <p className="text-h1 font-semibold text-muted-foreground">404</p>
      <h1 className="text-h3 font-medium">页面未找到</h1>
      <Button asChild>
        <Link href="${home}">返回首页</Link>
      </Button>
    </div>
  );
}
`;

const files = {
  "loading.tsx": LOADING,
  "error.tsx": ERROR,
  "not-found.tsx": NOT_FOUND,
};

mkdirSync(routeDir, { recursive: true });

let created = 0;
let skipped = 0;
for (const [name, content] of Object.entries(files)) {
  const path = resolve(routeDir, name);
  if (existsSync(path) && !force) {
    console.log(`  跳过（已存在，用 --force 覆盖）: ${path}`);
    skipped++;
    continue;
  }
  writeFileSync(path, content, "utf8");
  console.log(`  生成: ${path}`);
  created++;
}

console.log(`\n完成：${created} 生成，${skipped} 跳过。home = ${home}`);
console.log(`提示：图示用 undraw-recolor.mjs 着色后，替换文件里的 {/* <...Illustration/> */} 占位。`);
