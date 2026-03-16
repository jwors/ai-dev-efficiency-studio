import 'server-only';
import { callLLM } from '../../llm';
import { clampMessagesToBudget } from '../../llm/estimateToken';
import type { SessionState, ArchitectureJson } from '@/core/types';
import type { PluginResult } from '../types';
import { ArchitectureSchema } from './schema';
import { architectPrompt } from './prompt';
import { ZodError } from 'zod';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 2000;

function previewRawText(raw: string): string {
  return raw.replace(/\s+/g, ' ').slice(0, 240);
}

// 组件类型映射（处理 LLM 可能输出的变体）
const COMPONENT_TYPE_MAP: Record<string, ArchitectureJson['components'][number]['type']> = {
  frontend: 'frontend',
  'front-end': 'frontend',
  web: 'frontend',
  ui: 'frontend',
  backend: 'backend',
  'back-end': 'backend',
  server: 'backend',
  api: 'backend',
  database: 'database',
  db: 'database',
  'data-store': 'database',
  cache: 'cache',
  redis: 'cache',
  'cache-server': 'cache',
  queue: 'queue',
  'message-queue': 'queue',
  mq: 'queue',
  'api-gateway': 'api-gateway',
  gateway: 'api-gateway',
  'auth-service': 'auth-service',
  auth: 'auth-service',
  authentication: 'auth-service',
  storage: 'storage',
  'object-storage': 'storage',
  s3: 'storage',
  cdn: 'cdn',
  'external-api': 'external-api',
  external: 'external-api',
  thirdparty: 'external-api',
};

// 架构层映射
const LAYER_MAP: Record<string, ArchitectureJson['components'][number]['layer']> = {
  presentation: 'presentation',
  frontend: 'presentation',
  ui: 'presentation',
  application: 'application',
  service: 'application',
  api: 'application',
  domain: 'domain',
  business: 'domain',
  core: 'domain',
  infrastructure: 'infrastructure',
  infra: 'infrastructure',
  platform: 'infrastructure',
  data: 'data',
  database: 'data',
  persistence: 'data',
};

// 连接类型映射
const CONNECTION_TYPE_MAP: Record<string, ArchitectureJson['connections'][number]['type']> = {
  http: 'http',
  rest: 'http',
  api: 'http',
  websocket: 'websocket',
  ws: 'websocket',
  tcp: 'tcp',
  grpc: 'grpc',
  database: 'database',
  db: 'database',
  sql: 'database',
  cache: 'cache',
  redis: 'cache',
  queue: 'queue',
  mq: 'queue',
  message: 'queue',
  file: 'file',
  storage: 'file',
};

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

function normalizeArchitectureOutput(json: unknown): unknown {
  if (!json || typeof json !== 'object') return json;

  const source = json as Record<string, unknown>;

  // 处理架构层
  const layers = Array.isArray(source.layers)
    ? source.layers.map((layer: unknown) => {
        if (!layer || typeof layer !== 'object') return null;
        const item = layer as Record<string, unknown>;
        return {
          name: normalizeLayer(item.name),
          description: typeof item.description === 'string' ? item.description : undefined,
        };
      }).filter((l): l is NonNullable<typeof l> => l !== null)
    : [{ name: 'presentation' as const }, { name: 'application' as const }, { name: 'data' as const }];

  // 处理组件
  const components = Array.isArray(source.components)
    ? source.components.map((comp: unknown, index: number) => {
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
          metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata as Record<string, unknown> : undefined,
        };
      }).filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  // 处理连接
  const connections = Array.isArray(source.connections)
    ? source.connections.map((conn: unknown, index: number) => {
        if (!conn || typeof conn !== 'object') return null;
        const item = conn as Record<string, unknown>;

        const from = typeof item.from === 'string' ? item.from.trim() :
                     typeof item.source === 'string' ? item.source.trim() : '';
        const to = typeof item.to === 'string' ? item.to.trim() :
                   typeof item.target === 'string' ? item.target.trim() : '';

        if (!from || !to) return null;

        const fallbackId = `conn-${index + 1}`;
        const id = typeof item.id === 'string' && item.id.trim()
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
      }).filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  // 处理技术栈
  const techStack = Array.isArray(source.techStack)
    ? source.techStack.map((tech: unknown) => {
        if (!tech || typeof tech !== 'object') return null;
        const item = tech as Record<string, unknown>;
        return {
          category: typeof item.category === 'string' ? item.category : '',
          name: typeof item.name === 'string' ? item.name : '',
          version: typeof item.version === 'string' ? item.version : undefined,
          reason: typeof item.reason === 'string' ? item.reason : undefined,
        };
      }).filter((t): t is NonNullable<typeof t> => t !== null && t.name !== '')
    : [];

  // 处理决策
  const decisions = Array.isArray(source.decisions)
    ? source.decisions.map((dec: unknown) => {
        if (!dec || typeof dec !== 'object') return null;
        const item = dec as Record<string, unknown>;
        return {
          topic: typeof item.topic === 'string' ? item.topic : '',
          choice: typeof item.choice === 'string' ? item.choice : '',
          reason: typeof item.reason === 'string' ? item.reason : '',
          alternatives: normalizeStringArray(item.alternatives),
        };
      }).filter((d): d is NonNullable<typeof d> => d !== null && d.topic !== '')
    : undefined;

  // 处理更新记录
  const updates = source.updates && typeof source.updates === 'object'
    ? source.updates as Record<string, unknown>
    : {};

  return {
    version: 'arch.v1' as const,
    title: typeof source.title === 'string' && source.title.trim()
      ? source.title.trim()
      : '系统架构',
    description: typeof source.description === 'string' ? source.description : undefined,
    style: source.style === 'monolith' || source.style === 'microservice' ||
           source.style === 'serverless' || source.style === 'hybrid'
      ? source.style
      : 'monolith' as const,
    layers,
    components,
    connections,
    techStack,
    decisions,
    updates: {
      addedComponentIds: normalizeStringArray(updates.addedComponentIds),
      updatedComponentIds: normalizeStringArray(updates.updatedComponentIds),
      removedComponentIds: normalizeStringArray(updates.removedComponentIds),
      addedConnectionIds: normalizeStringArray(updates.addedConnectionIds),
      removedConnectionIds: normalizeStringArray(updates.removedConnectionIds),
    },
  };
}

function formatZodIssues(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

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