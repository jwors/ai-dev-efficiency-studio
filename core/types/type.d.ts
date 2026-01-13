// core/types/context.ts

import { emit } from 'process';

export interface PlanStep {
  action: string;
  params: Record<string, any>;
  id?: string;
  dependsOn?: string[];
}

export interface Message { 
  role:'user' | 'assistant' | 'system',
  content: string,
  mate?:{ tag?: string };
}

export interface Observation  { 
  emits: Array<{ context: string, at: string }>
  facts?:Record<string,unknown>
}


export type SessionState = {
  sessionId: string;
  summary: string;        // 长期摘要（短，稳定携带）
  history: Message[];     // 最近对话（滚动窗口）
  observation?: {
    emits: Array<{ content: string; at: string }>;
  };
  updatedAt: number,
  createdAt: number;
};

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
  notes?: string[];
  context?: Record<string, unknown>;
  results?: ExecutionResult[];
  currentStepIndex?: number;
  variables?: Record<string, unknown>;
  errors?: string[];
}

export interface ContextState {
  plan: Plan | null;
  results: ExecutionResult[];
  outputs: OutputItem[];
  // Internal state (not exposed to UI directly).
  variables: Record<string, any>;
  currentStepIndex: number;
}

type LLMRawResponse = {
  content: string;
  meta: { id?: string; created?: number; model?: string };
};