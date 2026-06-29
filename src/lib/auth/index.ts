/**
 * 认证模块出口（客户端安全面）。
 *
 * ⚠️ 服务端专属 API（getSession / requireSession / requirePermission / setSessionCookie /
 *    clearSessionCookie）位于 `./session`，**不要**在此再导出，
 *    以免被客户端组件经 barrel 误引入 next/headers。服务端请直接：
 *    `import { requireSession } from "@/lib/auth/session"`。
 */
export * from "./session-codec";
export * from "./session-provider";
export { Can } from "./can";
export { signIn, type SignInState } from "./sign-in";
export { signOut } from "./sign-out";
