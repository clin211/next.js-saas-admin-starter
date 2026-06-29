import { defineConfig } from "vitest/config";

// 纯函数单元测试：node 环境即可，无需 jsdom。§6.3 / §7.2 回归安全网。
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
