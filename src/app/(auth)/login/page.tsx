import Link from "next/link";
import { redirect } from "next/navigation";
import { Gauge, Layers, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/auth/session";
import { DEV_SESSION } from "@/lib/auth/session-codec";
import { DEMO_CREDENTIALS } from "@/lib/auth/demo-credentials";

import { LoginForm } from "./login-form";

export const metadata = { title: "登录" };

/** 品牌展示区的亮点条目（图标 + 标题 + 一句话）。 */
const highlights = [
  {
    icon: ShieldCheck,
    title: "细粒度权限",
    desc: "基于角色的访问控制，前后端双重校验。",
  },
  {
    icon: Layers,
    title: "模块化架构",
    desc: "特性模块自包含，删一个功能即删一个目录。",
  },
  {
    icon: Gauge,
    title: "SSR 安全数据层",
    desc: "服务端取首屏，客户端接管增删改。",
  },
];

/**
 * 开发期「游客进入」：写入占位 session cookie 跳过 proxy 守卫。
 * 仅 development 生效；生产环境调用会被打回 /login，防止绕过认证。
 */
async function guestEnter(target: string) {
  "use server";
  if (env.NODE_ENV !== "development") {
    redirect("/login");
  }
  // 开发期写入默认会话票据，跳过真实认证；与正式 signIn 同形状。
  await setSessionCookie(DEV_SESSION);
  redirect(target || "/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const target = callbackUrl ?? "/dashboard";

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.15fr_1fr]">
      {/* —— 品牌展示区：深色品牌面 + 柔焦弥散光，仅大屏展示 —— */}
      <aside className="relative hidden overflow-hidden bg-rail text-rail-foreground lg:flex lg:flex-col">
        {/* 氛围光（Aurora）：两团柔焦品牌色弥散，引用令牌不写死 hex */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-44 size-[30rem] rounded-full opacity-50 blur-[110px]"
          style={{ background: "radial-gradient(circle, var(--brand-to), transparent 68%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-44 -left-28 size-[26rem] rounded-full opacity-40 blur-[110px]"
          style={{ background: "radial-gradient(circle, var(--brand-from), transparent 68%)" }}
        />

        {/* 顶部：渐变标 + 站点名 + 系统在线（脉冲点呼应 sidebar-rail 设计语言） */}
        <div className="relative flex items-center justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
              }}
            >
              SA
            </span>
            <span className="text-h4 font-semibold tracking-tight">{siteConfig.name}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-caption text-rail-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            系统在线
          </span>
        </div>

        {/* 中部：价值主张（关键词渐变文字）+ 玻璃质感亮点卡 */}
        <div className="relative flex flex-1 flex-col justify-center gap-8 p-10 xl:p-14">
          <div className="max-w-xl space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-rail-border bg-rail-foreground/5 px-3 py-1 text-overline uppercase tracking-wide text-rail-muted backdrop-blur-sm">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{
                  backgroundImage: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
                }}
              />
              B 端 SaaS 管理后台
            </span>
            <h2 className="text-h1 font-semibold tracking-tight">
              <span className="text-rail-foreground/90">为下一代团队打造的</span>
              <br />
              <span
                style={{
                  backgroundImage: "linear-gradient(120deg, var(--brand-from), var(--brand-to))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                统一控制台
              </span>
            </h2>
            <p className="max-w-md text-body text-rail-muted">
              设计体系、权限闸、请求层与数据底座一站就位，让业务模块按约定快速组装，从容掌控全局。
            </p>
          </div>

          <ul className="grid max-w-xl gap-3">
            {highlights.map((item, index) => (
              <li
                key={item.title}
                className="group flex animate-in fade-in-0 slide-in-from-bottom-3 items-start gap-3 rounded-xl border border-rail-border bg-rail-foreground/5 p-4 backdrop-blur-sm transition-colors duration-(--duration-normal) hover:bg-rail-foreground/10"
                style={{ animationDelay: `${120 + index * 90}ms`, animationFillMode: "both" }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rail-foreground/10 text-rail-foreground transition-colors group-hover:bg-rail-foreground/15">
                  <item.icon className="size-4" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-small font-medium">{item.title}</p>
                  <p className="text-caption text-rail-muted">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 底部：技术指标（诚实呈现基建属性）+ 细分隔线 + 版权 */}
        <div className="relative space-y-4 p-10 xl:p-14">
          <div className="flex flex-wrap items-center gap-2">
            {["Next.js 16", "RBAC", "多租户", "SSR 安全", "TypeScript"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-rail-border px-2.5 py-1 text-caption text-rail-muted"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="h-px w-full bg-rail-border" />
          <p className="text-caption text-rail-muted">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </aside>

      {/* —— 表单区：居中卡片，始终可见（移动端为唯一可见区） —— */}
      <section className="flex min-h-svh items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
          {/* 移动端 Logo（大屏时品牌已在左侧展示，这里仍保留以作识别） */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--brand-from), var(--brand-to))",
              }}
            >
              SA
            </span>
            <span className="text-body font-semibold">{siteConfig.name}</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-h2 font-semibold tracking-tight">欢迎回来</h1>
            <p className="text-small text-muted-foreground">登录到你的工作区以继续</p>
          </div>

          <div className="mt-8">
            <LoginForm callbackUrl={target} />
          </div>

          {env.NODE_ENV === "development" ? (
            <div className="mt-4 space-y-3">
              {/* 演示凭证提示：演示阶段让访客一眼看到可用的固定测试账号 */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-small text-muted-foreground">
                <span className="font-medium text-foreground">演示账号</span>
                <span>
                  用户名{" "}
                  <code className="font-mono text-foreground">{DEMO_CREDENTIALS.username}</code>
                </span>
                <span>
                  密码{" "}
                  <code className="font-mono text-foreground">{DEMO_CREDENTIALS.password}</code>
                </span>
              </div>
              <form action={guestEnter.bind(null, target)}>
                <Button type="submit" variant="outline" className="w-full">
                  游客进入（开发模式）
                </Button>
              </form>
            </div>
          ) : null}

          <p className="mt-8 text-center text-small text-muted-foreground">
            还没有账号？
            <Link href="/register" className="ml-1 font-medium text-primary hover:underline">
              立即注册
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
