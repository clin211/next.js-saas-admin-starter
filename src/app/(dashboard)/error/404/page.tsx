import Link from "next/link";

import { ErrorScene } from "@/components/blocks/error-scene";
import { Error404Illustration } from "@/components/illustrations/error-404";
import { Button } from "@/components/ui/button";

export const metadata = { title: "404 · 页面未找到" };

export default function Error404Page() {
  return (
    <ErrorScene
      code="404"
      title="页面未找到"
      description="您访问的页面不存在或已被移动。"
      illustration={<Error404Illustration className="w-64 text-primary" />}
      actions={
        <Button asChild>
          <Link href="/dashboard">返回首页</Link>
        </Button>
      }
    />
  );
}
