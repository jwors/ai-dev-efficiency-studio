// core/types/context.ts

export interface PlanStep {
  action: string;
  params: Record<string, any>;
  id?: string;
  dependsOn?: string[];
}

export interface Message { 
  role:'user' | 'assistant' | 'system',
  content:string  
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
