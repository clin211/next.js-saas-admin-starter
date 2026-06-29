"use server";

import { redirect } from "next/navigation";

import { clearSessionCookie } from "./session";

/**
 * 退出登录：清除 httpOnly 会话 cookie 并跳转登录页。
 * cookie 仅服务端可写/删，故收口为 server action；客户端菜单项直接调用即可。
 */
export async function signOut() {
  await clearSessionCookie();
  redirect("/login");
}
