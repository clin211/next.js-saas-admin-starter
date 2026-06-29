import {
  MutationCache,
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";

import { ValidationError } from "@/lib/api/errors";
import { notifyError } from "@/lib/toast";

/**
 * TanStack Query SSR-safe client factory. Browser reuses a singleton so cache
 * survives re-renders; server always creates a fresh one per request.
 * Pair with `prefetchQuery` + <HydrateBoundary> in RSC (§3.1 / §6.2).
 *
 * 错误处理分层：
 *  - MutationCache.onError 兜底所有 mutation 失败：非 422 统一 Toast（避免每个 hook 复制）。
 *    422（ValidationError）跳过——字段级错误由表单就近 form.setError 回填，不弹 Toast。
 *  - Query 失败保持静默（不加 QueryCache.onError）：后台 refetch 失败不应打扰用户。
 */
function makeQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError(error) {
        // 422 由表单处理；其余错误持久提示并可重试
        if (error instanceof ValidationError) return;
        notifyError(error instanceof Error ? error.message : "操作失败，请稍后重试");
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
