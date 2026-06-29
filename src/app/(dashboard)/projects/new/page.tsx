import { PageHeader } from "@/components/blocks/page-header";
import { ProjectForm } from "@/features/projects/components/project-form";
import { requireSession } from "@/lib/auth/session";

export const metadata = { title: "新建项目" };

export default async function NewProjectPage() {
  await requireSession();
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="新建项目" description="填写基本信息以创建项目" />
      <div className="rounded-lg border border-border bg-card p-6">
        <ProjectForm />
      </div>
    </div>
  );
}
