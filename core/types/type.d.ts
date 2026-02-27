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



export type SessionState = {
  sessionId: string;
  summary: string;        // 长期摘要（短，稳定携带）
  history: Message[];     // 最近对话（滚动窗口）
  observation?: {
    emits: Array<{ content: string; at: string }>;
  };
  wbs?: WbsGraph;
  flowchart?: FlowchartJson;
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
  fatal?: boolean; // 表示是否被拦截
  data?: any;
  ok:boolean  // 表示这一步是否成功执行
  error?: string;
  timestamp: number;
}

export interface OutputItem {
  type: string;
  payload: any;
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
  metadata?: Record<string, any>;
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
