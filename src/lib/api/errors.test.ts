import { describe, expect, it } from "vitest";

import type { ApiError } from "./errors";
import {
  ApiError as ApiErrorClass,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "./errors";

/** 用 JSON 体构造 Response 的辅助函数。 */
function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

describe("ApiError.fromResponse —— 状态码到子类的归一化", () => {
  it("401 → AuthError", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ code: "UNAUTHENTICATED", message: "未登录" }, { status: 401 }),
    );
    expect(err).toBeInstanceOf(AuthError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHENTICATED");
  });

  it("403 → ForbiddenError", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ code: "FORBIDDEN", message: "无权限" }, { status: 403 }),
    );
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("404 → NotFoundError", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ code: "NOT_FOUND", message: "不存在" }, { status: 404 }),
    );
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("422 → ValidationError", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ code: "VALIDATION_FAILED", message: "校验失败" }, { status: 422 }),
    );
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION_FAILED");
  });

  it("429 → RateLimitError", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ code: "RATE_LIMITED", message: "频率过快" }, { status: 429 }),
    );
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.status).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
  });

  it("500 → 通用 ApiError", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ code: "INTERNAL", message: "炸了" }, { status: 500 }),
    );
    // 500 不落到任何子类，保持基类
    expect(err).not.toBeInstanceOf(AuthError);
    expect(err).not.toBeInstanceOf(ForbiddenError);
    expect(err).not.toBeInstanceOf(NotFoundError);
    expect(err).not.toBeInstanceOf(ValidationError);
    expect(err).not.toBeInstanceOf(RateLimitError);
    expect(err).toBeInstanceOf(ApiErrorClass);
    expect(err.status).toBe(500);
    expect(err.code).toBe("INTERNAL");
  });

  it("所有子类都是 ApiError 的实例", async () => {
    const cases: Array<{ status: number; expectedType: new (...args: never[]) => ApiError }> = [
      { status: 401, expectedType: AuthError as unknown as typeof AuthError },
      { status: 403, expectedType: ForbiddenError as unknown as typeof ForbiddenError },
      { status: 404, expectedType: NotFoundError as unknown as typeof NotFoundError },
      { status: 422, expectedType: ValidationError as unknown as typeof ValidationError },
      { status: 429, expectedType: RateLimitError as unknown as typeof RateLimitError },
    ];
    // 并行解析（避免 await-in-loop），再逐条断言（断言阶段无 await）。
    const errors = await Promise.all(
      cases.map(({ status }) =>
        ApiErrorClass.fromResponse(jsonResponse({ message: "x" }, { status })),
      ),
    );
    errors.forEach((err, index) => {
      expect(err).toBeInstanceOf(cases[index]!.expectedType);
      expect(err).toBeInstanceOf(ApiErrorClass);
    });
  });

  it("body 无 code 时回退 HTTP_<status>", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ message: "oops" }, { status: 502 }),
    );
    expect(err.code).toBe("HTTP_502");
    expect(err.message).toBe("oops");
  });
});

describe("ValidationError.fieldErrors —— 422 字段级回填", () => {
  it("details 为标准数组 → 映射为 { field: message }", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse(
        {
          details: [
            { field: "name", message: "必填" },
            { field: "email", message: "格式错误" },
          ],
        },
        { status: 422 },
      ),
    );
    expect(err).toBeInstanceOf(ValidationError);
    const fieldErrors = (err as ValidationError).fieldErrors();
    expect(fieldErrors).toEqual({ name: "必填", email: "格式错误" });
  });

  it("details 非数组 → 返回空对象 {}", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ details: { field: "name", message: "结构错" } }, { status: 422 }),
    );
    expect((err as ValidationError).fieldErrors()).toEqual({});
  });

  it("details 缺失 → 返回空对象 {}", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({ message: "校验失败" }, { status: 422 }),
    );
    expect((err as ValidationError).fieldErrors()).toEqual({});
  });

  it("details 元素缺 field 或 message → 被过滤", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse(
        { details: [{ field: "name" }, { message: "孤儿" }, { field: "ok", message: "保留" }] },
        { status: 422 },
      ),
    );
    expect((err as ValidationError).fieldErrors()).toEqual({ ok: "保留" });
  });
});

describe("RateLimitError.retryAfterMs —— Retry-After 头解析", () => {
  it('Retry-After: "5" → 约 5000ms', async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({}, { status: 429, headers: { "Retry-After": "5" } }),
    );
    const ms = (err as RateLimitError).retryAfterMs();
    expect(ms).toBe(5000);
  });

  it("Retry-After 为 HTTP 日期串 → 相对正数", async () => {
    const future = new Date(Date.now() + 10_000).toUTCString();
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({}, { status: 429, headers: { "Retry-After": future } }),
    );
    const ms = (err as RateLimitError).retryAfterMs();
    expect(typeof ms).toBe("number");
    expect(ms).toBeGreaterThan(0);
  });

  it("Retry-After 为无法解析的脏值 → undefined", async () => {
    const err = await ApiErrorClass.fromResponse(
      jsonResponse({}, { status: 429, headers: { "Retry-After": "not-a-date-or-number" } }),
    );
    expect((err as RateLimitError).retryAfterMs()).toBeUndefined();
  });

  it("无 Retry-After 头 → undefined", async () => {
    const err = await ApiErrorClass.fromResponse(jsonResponse({}, { status: 429 }));
    expect((err as RateLimitError).retryAfterMs()).toBeUndefined();
  });
});

describe("ApiError.fromResponse —— 非 JSON 响应体兜底", () => {
  it("纯文本 body 不抛错，回退 statusText", async () => {
    const res = new Response("err", { status: 500, statusText: "Internal Server Error" });
    const err = await ApiErrorClass.fromResponse(res);
    expect(err).toBeInstanceOf(ApiErrorClass);
    expect(err.status).toBe(500);
    expect(err.code).toBe("HTTP_500");
    // message 回退到 statusText
    expect(err.message).toBe("Internal Server Error");
  });
});
