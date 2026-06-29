/** 统一错误体系：不要把错误当成 string。§7.2 */
type ErrorPayload = { code?: string; message?: string; details?: unknown };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 把 Response 归一化为具体的 ApiError 子类（尽量读 Retry-After / 错误体）。 */
  static async fromResponse(response: Response): Promise<ApiError> {
    let payload: ErrorPayload = {};
    try {
      payload = (await response.clone().json()) as ErrorPayload;
    } catch {
      // 非 JSON 响应体（如 5xx 的纯文本）；response.clone() 保底，避免下游再读时已耗尽
    }

    const code = payload.code ?? `HTTP_${response.status}`;
    const message = payload.message ?? response.statusText;

    switch (response.status) {
      case 401:
        return new AuthError(code, message, payload.details);
      case 403:
        return new ForbiddenError(code, message, payload.details);
      case 404:
        return new NotFoundError(code, message, payload.details);
      case 422:
        return new ValidationError(code, message, payload.details);
      case 429: {
        // Retry-After 可能是秒数或 HTTP 日期；统一原样透传，由消费侧决定如何禁用。§7.2
        const retryAfter = response.headers.get("Retry-After") ?? undefined;
        return new RateLimitError(code, message, payload.details, retryAfter);
      }
      default:
        return new ApiError(response.status, code, message, payload.details);
    }
  }
}

/** 422 —— 表单字段级错误回填。 */
export class ValidationError extends ApiError {
  constructor(code: string, message: string, details?: unknown) {
    super(422, code, message, details);
    // 跨 RSC/client 边界序列化靠 name 字符串（原型丢失，instanceof 不可靠），故各自设独立 name
    this.name = "ValidationError";
  }

  /** details 约定为 { field: string; message: string }[]，便于回填 RHF。 */
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return (this.details as Array<{ field?: string; message?: string }>).reduce<
      Record<string, string>
    >((acc, item) => {
      if (item?.field && item?.message) acc[item.field] = item.message;
      return acc;
    }, {});
  }
}

/** 401 —— 跳登录。 */
export class AuthError extends ApiError {
  constructor(code: string, message: string, details?: unknown) {
    super(401, code, message, details);
    this.name = "AuthError";
  }
}

/** 403 —— 显示无权限。 */
export class ForbiddenError extends ApiError {
  constructor(code: string, message: string, details?: unknown) {
    super(403, code, message, details);
    this.name = "ForbiddenError";
  }
}

/** 404。 */
export class NotFoundError extends ApiError {
  constructor(code: string, message: string, details?: unknown) {
    super(404, code, message, details);
    this.name = "NotFoundError";
  }
}

/** 429 —— 禁用操作至重试时间。 */
export class RateLimitError extends ApiError {
  constructor(
    code: string,
    message: string,
    details?: unknown,
    /** 来自 `Retry-After` 响应头：秒数或 HTTP 日期字符串。 */
    public readonly retryAfter?: string,
  ) {
    super(429, code, message, details);
    this.name = "RateLimitError";
  }

  /** 将 retryAfter 折算为「距下次可重试的毫秒数」，无法解析则返回 undefined。 */
  retryAfterMs(now: number = Date.now()): number | undefined {
    if (!this.retryAfter) return undefined;
    const asSeconds = Number(this.retryAfter);
    if (Number.isFinite(asSeconds)) return Math.max(0, asSeconds * 1000);
    const parsed = Date.parse(this.retryAfter);
    if (Number.isFinite(parsed)) return Math.max(0, parsed - now);
    return undefined;
  }
}
