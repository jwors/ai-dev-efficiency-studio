// types/context.ts

export interface PlanStep {
  action: string;
  params: Record<string, any>;
  id?: string;          // 可选：用于依赖追踪
  dependsOn?: string[]; // 可选：依赖的步骤 ID
}

export interface Plan {
  goal: string;
  steps: PlanStep[];
}

export interface ExecutionResult {
  stepIndex: number;
  type: string;
  ok: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface OutputItem {
  type: string;
  payload: any;
}

export interface Observation {
  outputs: OutputItem[];
  // 未来可扩展：errors, variables, etc.
}

export interface ContextState {
  plan: Plan | null;
  results: ExecutionResult[];
  outputs: OutputItem[];
  // 内部状态（不直接暴露给前端）
  variables: Record<string, any>; // 用于步骤间传值
  currentStepIndex: number;
}