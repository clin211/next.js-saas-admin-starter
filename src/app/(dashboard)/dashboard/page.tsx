import { PageHeader } from "@/components/blocks/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "仪表盘" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="仪表盘" description="工作台概览" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["stat-1", "stat-2", "stat-3", "stat-4"].map((key) => (
          <div key={key} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
