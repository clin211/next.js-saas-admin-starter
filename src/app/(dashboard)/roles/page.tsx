import { Construction } from "lucide-react";

import { EmptyState } from "@/components/blocks/empty-state";
import { PageHeader } from "@/components/blocks/page-header";

export const metadata = { title: "角色权限" };

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="角色权限" description="角色与权限矩阵" />
      <EmptyState icon={Construction} title="建设中" description="该模块尚在开发中" />
    </div>
  );
}
