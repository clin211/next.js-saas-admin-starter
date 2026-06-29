import { NextResponse, type NextRequest } from "next/server";

import { deleteProject, getProject, updateProject } from "@/lib/api/mock/store";

type Context = { params: Promise<{ id: string }> };

/** GET /api/projects/:id */
export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ code: "NOT_FOUND", message: "项目不存在" }, { status: 404 });
  }
  return NextResponse.json(project);
}

/** PATCH /api/projects/:id */
export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = updateProject(id, body);
  if (!result.ok) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "输入校验失败", details: result.details },
      { status: 422 },
    );
  }
  if (!result.project) {
    return NextResponse.json({ code: "NOT_FOUND", message: "项目不存在" }, { status: 404 });
  }
  return NextResponse.json(result.project);
}

/** DELETE /api/projects/:id —— 204 No Content。 */
export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const ok = deleteProject(id);
  if (!ok) {
    return NextResponse.json({ code: "NOT_FOUND", message: "项目不存在" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
