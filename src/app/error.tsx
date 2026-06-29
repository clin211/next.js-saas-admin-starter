"use client";

import { ErrorScene } from "@/components/blocks/error-scene";
import { Error404Illustration } from "@/components/illustrations/error-404";
import { Error500Illustration } from "@/components/illustrations/error-500";
import { Button } from "@/components/ui/button";

/**
 * 路由级错误边界（保留布局）。§12.1
 *
 * 分支依据：error.name 字符串（不是 instanceof）。原因——错误跨 RSC/client 边界
 * 序列化后原型链丢失，instanceof 不可靠；但 ApiError 各子类在构造时设了独立 name
 * （见 lib/api/errors.ts），故 error.name === "NotFoundError" 等判定可靠。
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  // 404：资源不存在（NotFoundError）
  if (error.name === "NotFoundError") {
    return (
      <ErrorScene
        className="min-h-svh"
        code="404"
        title="页面不存在"
        description="你想找的内容可能已被删除或移动。"
        illustration={<Error404Illustration className="w-64 text-primary" />}
        actions={<Button onClick={reset}>重试</Button>}
      />
    );
  }

  // 429：请求过于频繁（RateLimitError）——带重试
  if (error.name === "RateLimitError") {
    return (
      <ErrorScene
        className="min-h-svh"
        tone="warning"
        title="请求过于频繁"
        description={error.message || "操作太快了，请稍后再试。"}
        illustration={<Error500Illustration className="w-64 text-primary" />}
        actions={<Button onClick={reset}>重试</Button>}
      />
    );
  }

  // 其余：通用 500
  return (
    <ErrorScene
      className="min-h-svh"
      title="出错了"
      description="页面加载遇到问题，请重试。"
      illustration={<Error500Illustration className="w-64 text-primary" />}
      actions={<Button onClick={reset}>重试</Button>}
    />
  );
}
