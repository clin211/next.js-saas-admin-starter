import Link from "next/link";

import { ErrorScene } from "@/components/blocks/error-scene";
import { Error401Illustration } from "@/components/illustrations/error-401";
import { Button } from "@/components/ui/button";

export const metadata = { title: "401 · 未授权" };

export default function Error401Page() {
  return (
    <ErrorScene
      code="401"
      title="未授权"
      description="此操作需要登录，请先完成身份验证。"
      illustration={<Error401Illustration className="w-64 text-primary" />}
      actions={
        <Button asChild>
          <Link href="/login">去登录</Link>
        </Button>
      }
    />
  );
}
