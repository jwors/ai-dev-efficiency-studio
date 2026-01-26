export type StepViewStatus = "ok" | "failed" | "skipped";

export type StepView = {
  stepIndex: number;
  action: string;
  params: any;

  status: StepViewStatus;

  ok?: boolean;
  fatal?: boolean;

  // 展示用
  message?: string;
  error?: string;

  // emit 的内容（如果这一步是 emit）
  emitContent?: string;

  // policy 拦截产生的 output（可能来自非 emit step）
  outputContent?: string;
};

export function mergePlanAndResults(plan: any, results: any[]): StepView[] {
  const map = new Map<number, any>();
  for (const r of results ?? []) map.set(r.stepIndex, r);

  return (plan?.steps ?? []).map((step: any, idx: number) => {
    const r = map.get(idx);

    if (!r) {
      return {
        stepIndex: idx,
        action: step.action,
        params: step.params,
        status: "skipped",
      };
    }

    return {
      stepIndex: idx,
      action: step.action,
      params: step.params,
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
