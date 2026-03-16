import 'server-only';
import { callLLM } from '../../llm';
import { clampMessagesToBudget } from '../../llm/estimateToken';
import type { SessionState, ArchitectureJson } from '@/core/types';
import type { PluginResult } from '../types';
import { ArchitectureSchema } from './schema';
import { architectPrompt } from './prompt';
import { COMPONENT_TYPE_MAP, LAYER_MAP, CONNECTION_TYPE_MAP } from './constants';
import { ZodError } from 'zod';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 2000;

function previewRawText(raw: string): string {
  return raw.replace(/\s+/g, ' ').slice(0, 240);
}

// ============ Normalization Functions ============

function normalizeComponentType(value: unknown): ArchitectureJson['components'][number]['type'] {
  if (typeof value !== 'string') return 'backend';
  return COMPONENT_TYPE_MAP[value.trim().toLowerCase()] ?? 'backend';
}

function normalizeLayer(value: unknown): ArchitectureJson['components'][number]['layer'] {
  if (typeof value !== 'string') return 'application';
  return LAYER_MAP[value.trim().toLowerCase()] ?? 'application';
}

function normalizeConnectionType(value: unknown): ArchitectureJson['connections'][number]['type'] {
  if (typeof value !== 'string') return 'http';
  return CONNECTION_TYPE_MAP[value.trim().toLowerCase()] ?? 'http';
}

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

function normalizeLayers(layers: unknown): ArchitectureJson['layers'] {
  if (!Array.isArray(layers)) {
    return [
      { name: 'presentation' as const },
      { name: 'application' as const },
      { name: 'data' as const },
    ];
  }

  return layers
    .map((layer: unknown) => {
      if (!layer || typeof layer !== 'object') return null;
      const item = layer as Record<string, unknown>;
      return {
        name: normalizeLayer(item.name),
        description: typeof item.description === 'string' ? item.description : undefined,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
}

function normalizeComponents(components: unknown): ArchitectureJson['components'] {
  if (!Array.isArray(components)) return [];

  return components
    .map((comp: unknown, index: number) => {
      if (!comp || typeof comp !== 'object') return null;
      const item = comp as Record<string, unknown>;

      const fallbackId = `component-${index + 1}`;
      const id = typeof item.id === 'string' && item.id.trim()
        ? item.id.trim()
        : fallbackId;

      const name = typeof item.name === 'string' && item.name.trim()
        ? item.name.trim()
        : typeof item.label === 'string' ? item.label : id;

      return {
        id,
        name,
        type: normalizeComponentType(item.type),
        layer: normalizeLayer(item.layer),
        description: typeof item.description === 'string' ? item.description : undefined,
        technology: typeof item.technology === 'string' ? item.technology : undefined,
        metadata:
          item.metadata && typeof item.metadata === 'object'
            ? (item.metadata as Record<string, unknown>)
            : undefined,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

function normalizeConnections(connections: unknown): ArchitectureJson['connections'] {
  if (!Array.isArray(connections)) return [];

  return connections
    .map((conn: unknown, index: number) => {
      if (!conn || typeof conn !== 'object') return null;
      const item = conn as Record<string, unknown>;

      const from =
        typeof item.from === 'string'
          ? item.from.trim()
          : typeof item.source === 'string'
            ? item.source.trim()
            : '';
      const to =
        typeof item.to === 'string'
          ? item.to.trim()
          : typeof item.target === 'string'
            ? item.target.trim()
            : '';

      if (!from || !to) return null;

      const fallbackId = `conn-${index + 1}`;
      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `${from}-to-${to}`;

      return {
        id,
        from,
        to,
        type: normalizeConnectionType(item.type),
        label: typeof item.label === 'string' ? item.label : undefined,
        description: typeof item.description === 'string' ? item.description : undefined,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

function normalizeTechStack(techStack: unknown): ArchitectureJson['techStack'] {
  if (!Array.isArray(techStack)) return [];

  return techStack
    .map((tech: unknown) => {
      if (!tech || typeof tech !== 'object') return null;
      const item = tech as Record<string, unknown>;
      return {
        category: typeof item.category === 'string' ? item.category : '',
        name: typeof item.name === 'string' ? item.name : '',
        version: typeof item.version === 'string' ? item.version : undefined,
        reason: typeof item.reason === 'string' ? item.reason : undefined,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null && t.name !== '');
}

function normalizeDecisions(decisions: unknown): ArchitectureJson['decisions'] | undefined {
  if (!Array.isArray(decisions)) return undefined;

  const result = decisions
    .map((dec: unknown) => {
      if (!dec || typeof dec !== 'object') return null;
      const item = dec as Record<string, unknown>;
      return {
        topic: typeof item.topic === 'string' ? item.topic : '',
        choice: typeof item.choice === 'string' ? item.choice : '',
        reason: typeof item.reason === 'string' ? item.reason : '',
        alternatives: normalizeStringArray(item.alternatives),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null && d.topic !== '');

  return result.length > 0 ? result : undefined;
}

function normalizeUpdates(
  updates: unknown,
): ArchitectureJson['updates'] {
  const source =
    updates && typeof updates === 'object'
      ? (updates as Record<string, unknown>)
      : {};

  return {
    addedComponentIds: normalizeStringArray(source.addedComponentIds),
    updatedComponentIds: normalizeStringArray(source.updatedComponentIds),
    removedComponentIds: normalizeStringArray(source.removedComponentIds),
    addedConnectionIds: normalizeStringArray(source.addedConnectionIds),
    removedConnectionIds: normalizeStringArray(source.removedConnectionIds),
  };
}

function normalizeArchitectureOutput(json: unknown): unknown {
  if (!json || typeof json !== 'object') return json;

  const source = json as Record<string, unknown>;

  const title =
    typeof source.title === 'string' && source.title.trim()
      ? source.title.trim()
      : '系统架构';

  const style =
    source.style === 'monolith' ||
    source.style === 'microservice' ||
    source.style === 'serverless' ||
    source.style === 'hybrid'
      ? source.style
      : ('monolith' as const);

  return {
    version: 'arch.v1' as const,
    title,
    description:
      typeof source.description === 'string' ? source.description : undefined,
    style,
    layers: normalizeLayers(source.layers),
    components: normalizeComponents(source.components),
    connections: normalizeConnections(source.connections),
    techStack: normalizeTechStack(source.techStack),
    decisions: normalizeDecisions(source.decisions),
    updates: normalizeUpdates(source.updates),
  };
}

// ============ Error Formatting ============

function formatZodIssues(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

// ============ Main Plugin Function ============

/**
 * 运行架构图生成插件。
 * 根据用户需求生成系统架构设计。
 * @param input - 用户输入（需求描述）
 * @param state - 会话状态
 * @returns 插件执行结果，包含架构图数据
 */
export async function runArchitectPlugin(
  input: string,
  state: SessionState,
): Promise<PluginResult<ArchitectureJson>> {
  // 构建 Prompt
  let context = architectPrompt(input, state);

  // Token 预算控制
  context = clampMessagesToBudget(context, MAX_PROMPT_TOKENS - RESERVED_OUTPUT);

  // 调用 LLM
  const rawText = await callLLM(context);

  let json: unknown;
  try {
    json = JSON.parse(rawText.content);
  } catch {
    console.error(
      `[Plugin:architect] JSON parse failed sessionId=${state.sessionId} provider=${rawText.meta.provider ?? 'unknown'} preview=${previewRawText(rawText.content)}`,
    );
    return {
      name: 'architect',
      ok: false,
      error: 'Architect plugin must return valid JSON',
    };
  }

  // 标准化输出
  const normalized = normalizeArchitectureOutput(json);

  // Zod 验证
  const parsed = ArchitectureSchema.safeParse(normalized);
  if (!parsed.success) {
    console.error(
      `[Plugin:architect] schema mismatch sessionId=${state.sessionId} provider=${rawText.meta.provider ?? 'unknown'} issues=${formatZodIssues(parsed.error)} preview=${previewRawText(rawText.content)}`,
    );
    return {
      name: 'architect',
      ok: false,
      error: `Invalid architecture output (schema mismatch): ${formatZodIssues(parsed.error)}`,
    };
  }

  // 更新会话状态
  state.architecture = parsed.data;

  return {
    name: 'architect',
    ok: true,
    data: parsed.data,
  };
}