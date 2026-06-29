"use client";

import { ErrorScene } from "@/components/blocks/error-scene";
import { Error500Illustration } from "@/components/illustrations/error-500";
import { Button } from "@/components/ui/button";

/**
 * 兜底错误边界，替换 <html>。此处无根 Provider 栈，故 ErrorScene 与插画组件必须保持
 * 纯标记、零 hook/context（勿在此引入 useTheme/useRouter/Query 等）。§12.1
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body className="bg-background text-foreground">
        <ErrorScene
          className="min-h-svh"
          title="应用错误"
          description="发生了一个全局错误，请重试。"
          illustration={<Error500Illustration className="w-64 text-primary" />}
          actions={<Button onClick={reset}>重试</Button>}
        />
      </body>
    </html>
  );
}
