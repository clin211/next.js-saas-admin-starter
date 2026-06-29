"use client";

import { useEffect, useId, useRef, useState, useActionState } from "react";
import { CircleAlert, Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, type SignInState } from "@/lib/auth/sign-in";

/**
 * 登录表单（客户端）。仅 username + password；核心职责之一是**防止重复登录**：
 * ① `lockRef` 即时上锁——React state 异步更新，拦不下「同一刻」的连点 / 回车连按；
 * ② `isPending` 期间整组字段置 disabled，按钮变「登录中…」并禁用；
 * ③ 服务端返回错误时以 role=alert 就近朗读，并解锁允许重试。
 * 闸门同时覆盖「鼠标连点」与「输入框内连按回车」两条触发路径。
 */
export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const usernameId = useId();
  const passwordId = useId();
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);

  const lockRef = useRef(false);
  useEffect(() => {
    // 请求结束（无论成败；成功路径会 redirect 卸载组件）后解锁，允许下一次提交。
    if (!isPending) lockRef.current = false;
  }, [isPending]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        // 闸门：提交进行中（ref 锁或 isPending）则取消本次提交，杜绝重复登录请求。
        if (lockRef.current || isPending) {
          event.preventDefault();
          return;
        }
        lockRef.current = true;
      }}
      className="space-y-4"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* 服务端校验错误：就近展示，role=alert 即时朗读（满足 aria-live-errors）。 */}
      {state?.error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-small text-destructive"
        >
          <CircleAlert className="size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <fieldset disabled={isPending} className="m-0 space-y-4 border-0 p-0">
        <div className="space-y-1.5">
          <label htmlFor={usernameId} className="text-small font-medium">
            用户名
          </label>
          <Input
            id={usernameId}
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="请输入用户名"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={passwordId} className="text-small font-medium">
            密码
          </label>
          <div className="relative">
            <Input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="请输入密码"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              登录中…
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              登录
            </>
          )}
        </Button>
      </fieldset>
    </form>
  );
}
