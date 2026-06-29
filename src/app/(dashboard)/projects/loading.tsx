import { PageHeader } from "@/components/blocks/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="项目管理" description="创建、归档与维护项目" />
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-64" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
