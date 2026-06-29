import { Construction } from "lucide-react";

import { EmptyState } from "@/components/blocks/empty-state";
import { PageHeader } from "@/components/blocks/page-header";

export const metadata = { title: "工作区设置" };

export default function WorkspaceSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="工作区设置" description="名称、品牌色与配额" />
      <EmptyState icon={Construction} title="建设中" description="该模块尚在开发中" />
    </div>
  );
}
