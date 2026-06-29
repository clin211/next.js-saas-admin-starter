import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "注册" };

export default function RegisterPage() {
  return (
    // 居中卡片：auth 布局已改为全屏画布，注册页自行居中以保持原有观感。
    <div className="flex min-h-svh items-center justify-center bg-muted p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-h2 font-semibold tracking-tight">创建账号</h1>
          <p className="text-small text-muted-foreground">注册一个新工作区</p>
        </div>

        <form className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-small font-medium">
              名称
            </label>
            <Input id="name" type="text" placeholder="你的名字" autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-small font-medium">
              邮箱
            </label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-small font-medium">
              密码
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full">
            注册
          </Button>
        </form>

        <p className="text-center text-small text-muted-foreground">
          已有账号？
          <Link href="/login" className="text-primary hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
