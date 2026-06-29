"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

/** 进度条最少停留时长：即使瞬时（缓存）跳转也保证可见并完成动画。 */
const MIN_DISPLAY = 320;

/**
 * 顶部路由进度条：仅路由跳转时出现，完成即收起。
 *
 * App Router 没有 routeChangeStart 事件，故用「History 劫持 + usePathname 兜底」双信号：
 *  - 开始：劫持 history.pushState/replaceState + popstate（覆盖 Link、router.push、前进/后退）；
 *    仅当 pathname 实际变化才触发，忽略同路径的 hash/query 更新以防卡死。
 *    与 Next 自身的 history 补丁共存（链式互调，互不影响）。
 *  - 完成：usePathname() 变化即收起，但至少展示 MIN_DISPLAY，避免瞬时跳转看不见。
 * 复用项目已装的 motion，无新增依赖。§3.3
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    const clearHide = () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
    const start = () => {
      clearHide();
      startedAt.current = Date.now();
      // history.pushState 可能在 React 的 useInsertionEffect/useLayoutEffect 期间被调用
      //（Next 的滚动恢复 / 历史同步），此时同步 setState 会触发 "must not schedule updates"。
      // 用微任务把状态更新推迟到提交阶段之外。
      queueMicrotask(() => setLoading(true));
    };

    // 用 typeof 推断形参类型，避免在 .tsx 中书写 <…> 泛型（被格式化断行后与 JSX 歧义）
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    const patchedPush: typeof history.pushState = (...args) => {
      const prev = window.location.pathname;
      pushState.apply(history, args);
      if (window.location.pathname !== prev) start();
    };
    const patchedReplace: typeof history.replaceState = (...args) => {
      const prev = window.location.pathname;
      replaceState.apply(history, args);
      if (window.location.pathname !== prev) start();
    };

    history.pushState = patchedPush;
    history.replaceState = patchedReplace;
    const onPop = () => start();
    window.addEventListener("popstate", onPop);

    return () => {
      history.pushState = pushState;
      history.replaceState = replaceState;
      window.removeEventListener("popstate", onPop);
      clearHide();
    };
  }, []);

  // 路由完成：pathname 变化即收起，但保证最少展示 MIN_DISPLAY（从开始算）
  useEffect(() => {
    if (startedAt.current === 0) return; // 首次挂载：尚无跳转，不触发
    const remaining = Math.max(0, MIN_DISPLAY - (Date.now() - startedAt.current));
    hideTimer.current = setTimeout(() => setLoading(false), remaining);
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [pathname]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="route-progress"
          aria-hidden
          className="fixed inset-x-0 top-0 `z-(--z-toast) h-0.5 origin-left bg-primary"
          style={{ boxShadow: "0 0 10px -1px var(--primary)" }}
          initial={{ scaleX: 0 }}
          animate={{
            scaleX: [0, 0.3, 0.55, 0.72, 0.82],
            transition: {
              duration: 3,
              times: [0, 0.2, 0.5, 0.8, 1],
              ease: [0.4, 0, 0.2, 1],
            },
          }}
          exit={{
            scaleX: 1,
            opacity: 0,
            transition: { duration: 0.3, ease: "easeOut" },
          }}
        />
      )}
    </AnimatePresence>
  );
}
