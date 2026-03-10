export type StepViewStatus = "ok" | "failed" | "skipped";

export type StepView = {
  stepIndex: number;
  action: string;
  params: Record<string, unknown>;

  status: StepViewStatus;

  ok?: boolean;
  fatal?: boolean;

  message?: string;
  error?: string;

  emitContent?: string;
  outputContent?: string;
};

type PlanLike = {
  steps: Array<{
    action: string;
    params?: Record<string, unknown>;
  }>;
};

type ResultLike = {
  stepIndex: number;
  ok?: boolean;
  fatal?: boolean;
  message?: string;
  error?: string;
  type?: string;
  data?: { content?: string };
  output?: { type?: string; payload?: { content?: string } };
};

/**
 * 合并计划和执行结果为步骤视图。
 * 用于在 UI 中展示每个步骤的执行状态。
 * @param plan - 计划对象，包含步骤数组
 * @param results - 执行结果数组
 * @returns 步骤视图数组，包含每个步骤的状态和输出
 */
export function mergePlanAndResults(plan: PlanLike, results: ResultLike[]): StepView[] {
  const map = new Map<number, ResultLike>();
  for (const r of results ?? []) map.set(r.stepIndex, r);

  return (plan?.steps ?? []).map((step, idx) => {
    const r = map.get(idx);

    if (!r) {
      return {
        stepIndex: idx,
        action: step.action,
        params: step.params ?? {},
        status: "skipped" as const,
      };
    }

    return {
      stepIndex: idx,
      action: step.action,
      params: step.params ?? {},
      status: r.ok ? "ok" : "failed",
      ok: r.ok,
      fatal: r.fatal,
      message: r.message,
      error: r.error,
      emitContent: r.type === "emit" ? r.data?.content : undefined,
      outputContent: r.output?.type === "emit" ? r.output.payload?.content : undefined,
    };
  });
}
