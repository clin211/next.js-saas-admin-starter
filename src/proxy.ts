import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session-codec";

/**
 * Next.js 16 Proxy（原 Middleware）：认证守卫。§3.4
 * 保持轻量：仅读 cookie、重定向；不访问数据库、不调外部 API。
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const raw = request.cookies.get(SESSION_COOKIE)?.value;

  // 无会话 → 跳登录并带上回调地址
  if (!raw) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 排除登录/注册、API、静态资源及任何带扩展名的文件
  matcher: ["/((?!login|register|api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
