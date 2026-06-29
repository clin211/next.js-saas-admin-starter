import { Construction } from "lucide-react";

import { EmptyState } from "@/components/blocks/empty-state";
import { PageHeader } from "@/components/blocks/page-header";

export const metadata = { title: "用户管理" };

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="用户管理" description="管理团队成员与权限" />
      <EmptyState icon={Construction} title="建设中" description="该模块尚在开发中" />
    </div>
  );
}
