import 'server-only';
import { callLLM } from '../../llm';
import { clampMessagesToBudget } from '../../llm/estimateToken';
import type { SessionState } from '@/core/types';
import type { PluginResult } from '../types';
import { WbsSchema, type WbsGraph } from './schema';
import { wbsPrompt } from '../../prompts/wbsPrompt';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1200;

function previewRawText(raw: string): string {
  return raw.replace(/\s+/g, ' ').slice(0, 240);
}

const NODE_TYPE_MAP: Record<string, WbsGraph['nodes'][number]['type']> = {
  goal: 'goal',
  root: 'goal',
  objective: 'goal',
  milestone: 'milestone',
  phase: 'milestone',
  stage: 'milestone',
  task: 'task',
  work: 'task',
  item: 'task',
  subtask: 'subtask',
  sub_task: 'subtask',
  'sub-task': 'subtask',
  child: 'subtask',
};

const NODE_STATUS_MAP: Record<string, WbsGraph['nodes'][number]['status']> = {
  todo: 'todo',
  pending: 'todo',
  not_started: 'todo',
  'not-started': 'todo',
  planned: 'todo',
  doing: 'doing',
  in_progress: 'doing',
  'in-progress': 'doing',
  progress: 'doing',
  done: 'done',
  completed: 'done',
  complete: 'done',
  finished: 'done',
  blocked: 'blocked',
  blocked_by_dependency: 'blocked',
};

const EDGE_TYPE_MAP: Record<string, WbsGraph['edges'][number]['type']> = {
  parent: 'parent',
  child: 'parent',
  hierarchy: 'parent',
  dependency: 'dependency',
  depends_on: 'dependency',
  'depends-on': 'dependency',
  prerequisite: 'dependency',
};

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeNodeType(value: unknown): WbsGraph['nodes'][number]['type'] {
  if (typeof value !== 'string') {
    return 'task';
  }

  return NODE_TYPE_MAP[value.trim().toLowerCase()] ?? 'task';
}

function normalizeNodeStatus(value: unknown): WbsGraph['nodes'][number]['status'] {
  if (typeof value !== 'string') {
    return 'todo';
  }

  return NODE_STATUS_MAP[value.trim().toLowerCase()] ?? 'todo';
}

function normalizeEdgeType(value: unknown): WbsGraph['edges'][number]['type'] {
  if (typeof value !== 'string') {
    return 'parent';
  }

  return EDGE_TYPE_MAP[value.trim().toLowerCase()] ?? 'parent';
}

function normalizeWbsOutput(json: unknown): unknown {
  if (!json || typeof json !== 'object') {
    return json;
  }

  const source = json as Record<string, unknown>;
  const nodes = Array.isArray(source.nodes) ? source.nodes : [];
  const normalizedNodes = nodes
    .map((node, index) => {
      if (!node || typeof node !== 'object') {
        return null;
      }

      const item = node as Record<string, unknown>;
      const fallbackId = `task-${index + 1}`;
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : fallbackId;
      const title =
        typeof item.title === 'string' && item.title.trim()
          ? item.title.trim()
          : typeof item.name === 'string' && item.name.trim()
            ? item.name.trim()
            : typeof item.label === 'string' && item.label.trim()
              ? item.label.trim()
              : id;
      const parentId =
        item.parentId == null
          ? null
          : typeof item.parentId === 'string' && item.parentId.trim()
            ? item.parentId.trim()
            : null;

      return {
        id,
        title,
        type: normalizeNodeType(item.type),
        status: normalizeNodeStatus(item.status),
        parentId,
        dependsOn: normalizeStringArray(item.dependsOn),
        notes: normalizeStringArray(item.notes),
      };
    })
    .filter((node): node is NonNullable<typeof node> => node !== null);

  const edges = Array.isArray(source.edges) ? source.edges : [];
  const normalizedEdges = edges
    .map((edge) => {
      if (!edge || typeof edge !== 'object') {
        return null;
      }

      const item = edge as Record<string, unknown>;
      const from =
        typeof item.from === 'string' && item.from.trim()
          ? item.from.trim()
          : typeof item.source === 'string' && item.source.trim()
            ? item.source.trim()
            : '';
      const to =
        typeof item.to === 'string' && item.to.trim()
          ? item.to.trim()
          : typeof item.target === 'string' && item.target.trim()
            ? item.target.trim()
            : '';

      if (!from || !to) {
        return null;
      }

      return {
        from,
        to,
        type: normalizeEdgeType(item.type),
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => edge !== null);

  const updates =
    source.updates && typeof source.updates === 'object'
      ? (source.updates as Record<string, unknown>)
      : {};

  return {
    version: source.version === 'wbs.v1' ? 'wbs.v1' : 'wbs.v1',
    goal:
      typeof source.goal === 'string' && source.goal.trim()
        ? source.goal.trim()
        : typeof source.title === 'string' && source.title.trim()
          ? source.title.trim()
          : '',
    nodes: normalizedNodes,
    edges: normalizedEdges,
    updates: {
      addedNodeIds: normalizeStringArray(updates.addedNodeIds),
      updatedNodeIds: normalizeStringArray(updates.updatedNodeIds),
      removedNodeIds: normalizeStringArray(updates.removedNodeIds),
    },
  };
}

function formatZodIssues(error: ReturnType<typeof WbsSchema.safeParse> extends { success: false; error: infer T } ? T : never): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

/**
 * 运行 WBS（工作分解结构）插件。
 * 根据用户输入生成 WBS 图结构，用于任务分解可视化。
 * @param input - 用户输入
 * @param state - 会话状态
 * @returns 插件执行结果，包含 WBS 图数据
 */
export async function runWbsPlugin(
  input: string,
  state: SessionState,
): Promise<PluginResult<WbsGraph>> {
  // wbs 的 prompt
  let context = wbsPrompt(input, state);

  // 上下文内容摘要
  context = clampMessagesToBudget(context, MAX_PROMPT_TOKENS - RESERVED_OUTPUT);

  const rawText = await callLLM(context);
  let json: unknown;
  try {
    json = JSON.parse(rawText.content);
  } catch {
    console.error(
      `[Plugin:wbs] JSON parse failed sessionId=${state.sessionId} provider=${rawText.meta.provider ?? 'unknown'} preview=${previewRawText(rawText.content)}`,
    );
    return {
      name: 'wbs',
      ok: false,
      error: 'WBS plugin must return valid JSON',
    };
  }

  // zod 验证
  const normalized = normalizeWbsOutput(json);
  const parsed = WbsSchema.safeParse(normalized);
  if (!parsed.success) {
    console.error(
      `[Plugin:wbs] schema mismatch sessionId=${state.sessionId} provider=${rawText.meta.provider ?? 'unknown'} issues=${formatZodIssues(parsed.error)} preview=${previewRawText(rawText.content)}`,
    );
    return {
      name: 'wbs',
      ok: false,
      error: `Invalid WBS output (schema mismatch): ${formatZodIssues(parsed.error)}`,
    };
  }

  state.wbs = parsed.data;
  return {
    name: 'wbs',
    ok: true,
    data: parsed.data,
  };
}
