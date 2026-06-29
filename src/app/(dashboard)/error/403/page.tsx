import Link from "next/link";

import { ErrorScene } from "@/components/blocks/error-scene";
import { Error403Illustration } from "@/components/illustrations/error-403";
import { Button } from "@/components/ui/button";

export const metadata = { title: "403 · 禁止访问" };

export default function Error403Page() {
  return (
    <ErrorScene
      code="403"
      title="禁止访问"
      description="您没有访问该资源的权限。"
      illustration={<Error403Illustration className="w-64 text-primary" />}
      actions={
        <Button asChild>
          <Link href="/dashboard">返回首页</Link>
        </Button>
      }
    />
  );
}
