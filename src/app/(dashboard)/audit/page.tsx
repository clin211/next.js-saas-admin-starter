import { Construction } from "lucide-react";

import { EmptyState } from "@/components/blocks/empty-state";
import { PageHeader } from "@/components/blocks/page-header";

export const metadata = { title: "审计日志" };

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="审计日志" description="关键操作记录" />
      <EmptyState icon={Construction} title="建设中" description="该模块尚在开发中" />
    </div>
  );
}
