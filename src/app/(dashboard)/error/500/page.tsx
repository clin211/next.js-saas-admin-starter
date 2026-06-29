import Link from "next/link";

import { ErrorScene } from "@/components/blocks/error-scene";
import { Error500Illustration } from "@/components/illustrations/error-500";
import { Button } from "@/components/ui/button";

export const metadata = { title: "500 · 服务器错误" };

export default function Error500Page() {
  return (
    <ErrorScene
      code="500"
      title="服务器错误"
      description="服务遇到意外问题，请稍后重试。"
      illustration={<Error500Illustration className="w-64 text-primary" />}
      actions={
        <Button asChild>
          <Link href="/dashboard">返回首页</Link>
        </Button>
      }
    />
  );
}
