import { env } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";

type Json = unknown;

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: Json;
  params?: Record<string, string | number | boolean | undefined>;
  /** 单次请求超时（ms），默认 15s。超时即 abort 并按网络错误走重试。 */
  timeoutMs?: number;
  /** 幂等请求（GET/HEAD/OPTIONS）在 5xx 或网络错误时的重试次数，默认 2。 */
  retries?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/* -------------------------------------------------------------------------- */
/* 请求拦截器接缝：可在 Provider 中注册（注入 requestId 头等）。§7.1   */
/* -------------------------------------------------------------------------- */
type RequestInterceptorContext = { path: string; method: string };
type RequestInterceptor = (
  init: RequestInit,
  ctx: RequestInterceptorContext,
) => RequestInit | Promise<RequestInit>;

const requestInterceptors: RequestInterceptor[] = [];

/** 注册一个请求拦截器，返回注销函数。 */
export function addRequestInterceptor(fn: RequestInterceptor): () => void {
  requestInterceptors.push(fn);
  return () => {
    const index = requestInterceptors.indexOf(fn);
    if (index >= 0) requestInterceptors.splice(index, 1);
  };
}

/* -------------------------------------------------------------------------- */
/* 401 处理接缝：客户端遇 401 时由 Provider 注册「跳登录」回调。§7.1 / §7.4     */
/* 服务端无回调 → 直接抛 AuthError，交由调用方（RSC/错误边界）处理。           */
/* -------------------------------------------------------------------------- */
let unauthorizedHandler: (() => void) | null = null;

/** 注册 401 回调（通常在客户端 Providers 中 set 为「清会话 + 跳 /login」）。 */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

/* -------------------------------------------------------------------------- */
/* 基地址解析：                                                                */
/*  - 设了 NEXT_PUBLIC_API_BASE_URL → 走真实后端（path 原样拼接）              */
/*  - 未设 → 开发期同源 /api mock（客户端相对；服务端用 APP_URL 解析绝对地址）   */
/* -------------------------------------------------------------------------- */
type Base = { origin: string; prefix: string };

function resolveBase(): Base {
  if (env.NEXT_PUBLIC_API_BASE_URL) {
    return { origin: env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, ""), prefix: "" };
  }
  const isServer = typeof window === "undefined";
  const origin = isServer ? env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "") : "";
  return { origin, prefix: "/api" };
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const { origin, prefix } = resolveBase();
  // 用一个占位绝对基址借 URL 解析 searchParams，再按需拼回绝对/相对串
  const fullPath = `${prefix}${path}`.replace(/\/{2,}/g, "/");
  const parser = new URL(fullPath, "http://_");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) parser.searchParams.set(key, String(value));
    }
  }
  return origin
    ? `${origin}${parser.pathname}${parser.search}`
    : `${parser.pathname}${parser.search}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 指数退避：第 n 次重试等待 min(300 * 2^n, 5s)。 */
function backoffDelay(attempt: number): number {
  return Math.min(300 * 2 ** attempt, 5_000);
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return error instanceof TypeError; // fetch 网络层失败统一抛 TypeError
}

/** 带 AbortController 超时的单次 fetch。 */
async function fetchOnce(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    params,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    ...rest
  } = options;
  const method = (rest.method ?? "GET").toUpperCase();

  let init: RequestInit = {
    ...rest,
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  };
  // 拦截器与重试均需串行 await（顺序敏感 / 退避依赖前次结果），统一关闭并行告警。
  /* eslint-disable no-await-in-loop */
  // 串行应用请求拦截器（注入 requestId 等）
  for (const intercept of requestInterceptors) {
    init = await intercept(init, { path, method });
  }

  const url = buildUrl(path, params);
  const canRetry = IDEMPOTENT_METHODS.has(method);

  let attempt = 0;
  // 重试循环：幂等请求遇 5xx / 网络错误按指数退避重试。
  for (;;) {
    let response: Response;
    try {
      response = await fetchOnce(url, init, timeoutMs);
    } catch (error) {
      if (canRetry && attempt < retries && isNetworkError(error)) {
        attempt += 1;
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw error;
    }

    // 401：触发客户端跳登录回调（若有），再抛 AuthError。
    if (response.status === 401) {
      if (typeof window !== "undefined") unauthorizedHandler?.();
      throw await ApiError.fromResponse(response);
    }

    // 5xx：幂等可重试。
    if (canRetry && response.status >= 500 && attempt < retries) {
      attempt += 1;
      await sleep(backoffDelay(attempt));
      continue;
    }

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
  /* eslint-enable no-await-in-loop */
}

/**
 * 单一 apiClient：泛型 request<T>，统一 baseURL/超时/重试/credentials/错误归一化/401 处理。
 * 既可用于 RSC（fetch 直连 + Next 缓存），也可给 TanStack Query 使用。§7.1
 */
export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: Json, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: Json, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: Json, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
