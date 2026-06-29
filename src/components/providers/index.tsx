"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteProgress } from "@/components/layout/route-progress";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { addRequestInterceptor, setUnauthorizedHandler } from "@/lib/api/client";
import { getQueryClient } from "@/lib/api/query-client";
import { MotionProvider } from "@/lib/motion";
import { signOut } from "@/lib/auth/sign-out";

/**
 * Root provider stack, mounted once in app/layout.tsx:
 * ThemeProvider → MotionProvider → QueryClientProvider → TooltipProvider.
 *
 * 另在此注册两类「请求层横切」：
 *  - 401 回调：apiClient 遇 401 即清会话 + 跳登录（仅客户端）。§7.1 / §7.4
 *  - 请求拦截器：注入 x-request-id，便于链路追踪。§7.1
 */
export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  useEffect(() => {
    // 401：交由 signOut（清 cookie + 跳 /login）。硬跳转天然丢弃客户端缓存。
    setUnauthorizedHandler(() => {
      void signOut();
    });

    // 请求拦截器：注入 requestId（浏览器 crypto；服务端不经此分支）。
    const unregister = addRequestInterceptor((init, { method }) => {
      // 只为写操作与列表请求加追踪头，避免对幂等 GET 的过度干预（此处统一加，足够示意）。
      const headers = new Headers(init.headers);
      if (!headers.has("x-request-id") && typeof crypto !== "undefined") {
        headers.set("x-request-id", crypto.randomUUID());
      }
      return { ...init, method, headers };
    });

    return () => {
      setUnauthorizedHandler(null);
      unregister();
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={200}>
            {children}
            <RouteProgress />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}
