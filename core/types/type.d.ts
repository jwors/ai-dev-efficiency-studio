// core/types/context.ts

export interface PlanStep {
  action: string;
  params: Record<string, unknown>;
  id?: string;
  dependsOn?: string[];
}

export interface Message { 
  role:'user' | 'assistant' | 'system',
  content: string,
  mate?:{ tag?: string };
}



import type { PolicyContext } from '../security/policyGuard';

export type SessionState = {
  sessionId: string;
  summary: string;        // 长期摘要（短，稳定携带）
  history: Message[];     // 最近对话（滚动窗口）
  observation?: {
    emits: Array<{ content: string; at: string }>;
  };
  wbs?: WbsGraph;
  flowchart?: FlowchartJson;
  policyContext?: PolicyContext;  // 安全策略上下文（会话级）
  updatedAt: number,
  createdAt: number;
  plan?: Plan | null;
  results?: ExecutionResult[];
  outputs?:OutputItem[]
};

export interface Plan {
  goal: string;
  steps: PlanStep[];
}

export interface ExecutionResult {
  stepIndex: number;
  type: string;
  fatal?: boolean;
  data?: unknown;
  ok: boolean;
  error?: string;
  timestamp: number;
}

export interface OutputItem {
  type: string;
  payload: unknown;
}

export type WbsNodeType = 'goal' | 'milestone' | 'task' | 'subtask';
export type WbsNodeStatus = 'todo' | 'doing' | 'done' | 'blocked';
export type WbsEdgeType = 'parent' | 'dependency';

export type WbsNode = {
  id: string;
  title: string;
  type: WbsNodeType;
  status: WbsNodeStatus;
  parentId: string | null;
  dependsOn: string[];
  notes: string[];
};

export type WbsEdge = {
  from: string;
  to: string;
  type: WbsEdgeType;
};

export type WbsGraph = {
  version: 'wbs.v1';
  goal: string;
  nodes: WbsNode[];
  edges: WbsEdge[];
  updates: {
    addedNodeIds: string[];
    updatedNodeIds: string[];
    removedNodeIds: string[];
  };
};

export type FlowchartJson = {
  version: 'flowchart.v1';
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  updates: {
    addedNodeIds: string[];
    updatedNodeIds: string[];
    removedNodeIds: string[];
    addedEdgeIds: string[];
    removedEdgeIds: string[];
  };
};

export type FlowNode = {
  id: string;
  label: string;
  type: 'start' | 'end' | 'task' | 'decision' | 'parallel' | 'subprocess' | 'io';
  status: 'todo' | 'doing' | 'done' | 'blocked';
  metadata?: Record<string, unknown>;
};

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
  type: 'sequence' | 'condition' | 'parallel';
};


export interface Observation {
  outputs: OutputItem[];
  notes?: string[];
  context?: Record<string, unknown>;
  results?: ExecutionResult[];
  currentStepIndex?: number;
  variables?: Record<string, unknown>;
  errors?: string[];
}

export interface ArtifactRecord {
  id: string;
  path: string;
  url: string;
  filename: string;
  kind: string;
  size: number;
  createdAt: number;
}

export interface ContextState {
  plan: Plan | null;
  results: ExecutionResult[];
  outputs: OutputItem[];
  variables: Record<string, unknown>;
  currentStepIndex: number;
}

type LLMRawResponse = {
  content: string;
  meta: { id?: string; created?: number; model?: string };
};
