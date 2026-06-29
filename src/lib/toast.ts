"use client";

import { toast } from "sonner";

/**
 * Sonner toast 规范封装（§10.5）：
 *  - 成功：静默，3s 自动消失。
 *  - 错误：持久（duration: Infinity），含可选「重试」动作，需手动关闭（Toaster 已开 closeButton）。
 *  - 进行中：用 notifyPromise 包裹，自动 loading→success/error。
 */
const SUCCESS_DURATION = 3000;

export function notifySuccess(message: string, description?: string) {
  return toast.success(message, { duration: SUCCESS_DURATION, description });
}

export function notifyError(
  message: string,
  options?: { description?: string; retry?: () => void },
) {
  return toast.error(message, {
    duration: Infinity,
    description: options?.description,
    action: options?.retry ? { label: "重试", onClick: options.retry } : undefined,
  });
}

export function notifyInfo(message: string, description?: string) {
  return toast.info(message, { duration: SUCCESS_DURATION, description });
}

export function notifyPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string | ((data: T) => string); error: string },
) {
  return toast.promise(promise, messages);
}

/** 透传原始 sonner，供需要完全自定义时使用。 */
export { toast };
