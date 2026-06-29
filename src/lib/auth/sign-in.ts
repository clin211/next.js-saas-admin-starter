"use server";

import { redirect } from "next/navigation";

import { env } from "@/lib/env";

import { setSessionCookie } from "./session";
import { DEV_SESSION } from "./session-codec";
import { DEMO_CREDENTIALS } from "./demo-credentials";

/** 表单 action 的返回状态：失败时携带表单级错误（客户端就近展示）。 */
export type SignInState = { error?: string } | undefined;

/**
 * 登录 Server Action。
 * 流程：取 username/password + callbackUrl →（桩）校验固定演示账号 → 写 httpOnly 会话票据 → redirect。
 * 防重复提交由客户端 LoginForm 的 ref 锁 + disabled 兜底。
 *
 * TODO(stub): 接真实后端 apiClient.post("/auth/login", { username, password })，
 *             以后端返回的 { user, role, plan } 构造 Session。
 *             当前为脚手架桩——仅放行固定演示账号（见 DEMO_CREDENTIALS），生产环境必须替换为真实校验。§7.1
 */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  // 生产闸：dev 鉴权桩（任意非空凭证即放行）禁止泄漏到生产，必须替换为真实后端校验。§7.1
  if (env.NODE_ENV === "production") {
    throw new Error(
      "dev 鉴权桩禁止在生产环境运行：必须替换为真实后端调用 apiClient.post('/auth/login', ...)",
    );
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeCallbackUrl(String(formData.get("callbackUrl") ?? ""));

  // 桩：仅放行固定演示账号（DEMO_CREDENTIALS）。统一返回「用户名或密码错误」，
  // 不区分是哪个字段错，以防用户名枚举。TODO 接真实接口后替换为后端校验。
  const matched = username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password;
  if (!matched) {
    return { error: "用户名或密码错误" };
  }

  // 桩：模拟一次认证往返耗时，使「登录中」态可被肉眼观察。TODO 接真实接口后移除。
  await new Promise((resolve) => setTimeout(resolve, 600));

  // 演示账号固定映射到 DEV_SESSION（owner + pro），可体验全部权限与 FeatureGate。
  await setSessionCookie(DEV_SESSION);

  redirect(callbackUrl);
}

/** 仅放行站内相对地址作为回调，杜绝开放重定向（open redirect）。 */
function safeCallbackUrl(raw: string): string {
  const fallback = "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
