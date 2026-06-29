/**
 * 全局 Query Key 工厂（仅跨 feature 的全局维度）。§6.2
 *
 * 设计：不再在中心硬编码各业务域（projects/users/...）的 key，否则每新增一个 feature
 * 都要回头改 lib。改为「每个 feature 自带 key 工厂」，范本见
 * `src/features/projects/query-keys.ts`。本文件只保留真正全局的维度。
 *
 * 用法：
 *   服务端 prefetch：`const k = makeKeys()`（取 me 等全局维度）
 *   客户端 hook：    `const k = useQueryKeys()`（见 lib/auth/session-provider）
 */
export function makeKeys() {
  return {
    /** 当前会话/订阅状态（FeatureGate 等）——跨 feature，故留在全局。 */
    me: ["me"] as const,
  };
}

export type QueryKeys = ReturnType<typeof makeKeys>;
