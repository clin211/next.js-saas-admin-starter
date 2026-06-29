import { NextResponse, type NextRequest } from "next/server";

import { createProject, listProjects } from "@/lib/api/mock/store";

/** GET /api/projects —— 分页/搜索/排序列表。查询参数：page, pageSize, q, sort=id.dir */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? "10") || 10));
  const search = sp.get("q") ?? "";
  const [sortId, dir] = (sp.get("sort") ?? "").split(".");

  const result = listProjects({
    page,
    pageSize,
    search,
    sortId: sortId || undefined,
    sortDesc: dir === "desc",
  });

  return NextResponse.json(result);
}

/** POST /api/projects —— 创建；校验失败返回 422 + 字段级 details（供前端表单回填）。 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const result = createProject(body);
  if (!result.ok) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "输入校验失败", details: result.details },
      { status: 422 },
    );
  }
  return NextResponse.json(result.project, { status: 201 });
}
