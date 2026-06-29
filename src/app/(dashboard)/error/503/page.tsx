import Link from "next/link";

import { ErrorScene } from "@/components/blocks/error-scene";
import { Error503Illustration } from "@/components/illustrations/error-503";
import { Button } from "@/components/ui/button";

export const metadata = { title: "503 · 服务不可用" };

export default function Error503Page() {
  return (
    <ErrorScene
      code="503"
      title="服务不可用"
      description="系统维护中，请稍后回来。"
      illustration={<Error503Illustration className="w-64 text-primary" />}
      actions={
        <Button asChild>
          <Link href="/dashboard">返回首页</Link>
        </Button>
      }
    />
  );
}
