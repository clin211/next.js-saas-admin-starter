import { Skeleton } from "@/components/ui/skeleton";

/** 路由段加载骨架，与最终布局同形以减少 CLS。§12.1 */
export default function Loading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["s-1", "s-2", "s-3", "s-4"].map((key) => (
          <Skeleton key={key} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
