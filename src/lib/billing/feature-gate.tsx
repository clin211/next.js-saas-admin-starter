"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FEATURE_PLAN, PLAN_LABELS, hasFeature, type Feature } from "@/config/billing";
import { useSession } from "@/lib/auth/session-provider";

/**
 * 计费特性闸：未达计划要求时显示「升级」引导而非直接禁用（转化漏斗）。§10.3
 * 真实可用性以后端订阅状态为准，这里仅做前端体验。
 */
export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const session = useSession();
  const allowed = session ? hasFeature(session.plan, feature) : false;

  if (allowed) return <>{children}</>;
  return <>{fallback ?? <UpgradeCta feature={feature} />}</>;
}

/** 判定特性是否可用（驱动按钮 disabled 等）。 */
export function useFeature(feature: Feature): boolean {
  const session = useSession();
  return session ? hasFeature(session.plan, feature) : false;
}

function UpgradeCta({ feature }: { feature: Feature }) {
  const required = FEATURE_PLAN[feature];
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-body font-medium text-foreground">该功能需要升级计划</p>
        <p className="text-caption text-muted-foreground">
          需要 <span className="font-medium text-foreground">{PLAN_LABELS[required]}</span>{" "}
          或更高版本
        </p>
      </div>
      <Button size="sm">升级计划</Button>
    </div>
  );
}
