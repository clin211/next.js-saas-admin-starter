import { Construction } from "lucide-react";

import { EmptyState } from "@/components/blocks/empty-state";
import { PageHeader } from "@/components/blocks/page-header";

export const metadata = { title: "提示词管理" };

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="提示词管理" description="维护提示词模板与版本" />
      <EmptyState icon={Construction} title="建设中" description="该模块尚在开发中" />
    </div>
  );
}
