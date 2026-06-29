/**
 * 演示用固定测试账号 —— 仅 development 生效。
 *
 * 用途：脚手架 / 演示阶段，让访客用一组公开的凭证快速进入系统体验全部功能
 * （owner + pro 计划，见 DEV_SESSION）。登录页在开发模式下会展示该账号。
 *
 * ⚠️ 这是一组**对外公开的演示密钥**，不代表任何真实鉴权：
 *   - 生产环境 signIn 会直接抛错（见 sign-in.ts 的生产闸），此账号在生产不可用；
 *   - 接真实后端后，连同 sign-in.ts 的演示校验与登录页提示整段移除。§7.1
 */
export const DEMO_CREDENTIALS = {
  username: "admin",
  password: "admin123",
} as const;
