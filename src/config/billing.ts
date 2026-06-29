import { PLANS, type Plan } from "@/lib/auth/session-codec";

/**
 * 计费 / 订阅（FeatureGate）。§10.3
 * 前端显隐/引导仅为体验与转化漏斗；真实额度校验由后端按租户订阅状态裁决。
 */

export type Feature =
  | "advanced-export"
  | "audit-export"
  | "custom-roles"
  | "api-access"
  | "unlimited-projects";

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, enterprise: 2 };

/** 各特性所需最低计划。 */
export const FEATURE_PLAN: Record<Feature, Plan> = {
  "advanced-export": "pro",
  "audit-export": "enterprise",
  "custom-roles": "enterprise",
  "api-access": "pro",
  "unlimited-projects": "enterprise",
};

/** 计划标签（展示用）。 */
export const PLAN_LABELS: Record<Plan, string> = {
  free: "免费版",
  pro: "专业版",
  enterprise: "企业版",
};

/** 当前计划是否覆盖该特性。 */
export function hasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_PLAN[feature]];
}

export { PLANS };
