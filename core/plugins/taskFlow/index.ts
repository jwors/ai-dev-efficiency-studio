import 'server-only';

import { callLLM } from '@/core/llm';
import { clampMessagesToBudget } from '@/core/llm/estimateToken';
import type { SessionState } from '@/core/types';
import type { PluginResult } from '../types';
import { FlowchartSchema, type FlowchartGraph } from './schema';
import { flowchartPrompt } from '@/core/prompts/taskFlowPrompt';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1200;

/**
 * 预览原始文本，移除多余空白并截断。
 * @param raw - 原始文本
 * @returns 预览字符串
 */
function previewRawText(raw: string): string {
  return raw.replace(/\s+/g, ' ').slice(0, 240);
}

import { ZodError } from 'zod';

/**
 * 格式化 Zod 验证错误信息。
 * @param error - Zod 验证错误对象
 * @returns 格式化后的错误字符串
 */
function formatFlowIssues(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

/**
 * 运行任务流程图生成插件。
 * 根据用户输入生成流程图结构，用于可视化任务执行流程。
 * @param input - 用户输入
 * @param state - 会话状态
 * @returns 插件执行结果，包含流程图数据
 */
export async function runTaskFlowPlugin(
  input: string,
  state: SessionState,
): Promise<PluginResult<FlowchartGraph>> {
  let context = flowchartPrompt(input, state);
  context = clampMessagesToBudget(context, MAX_PROMPT_TOKENS - RESERVED_OUTPUT);

  const rawText = await callLLM(context);

  let json: unknown;
  try {
    json = JSON.parse(rawText.content);
  } catch {
    console.error(
      `[Plugin:tf] JSON parse failed sessionId=${state.sessionId} provider=${rawText.meta.provider ?? 'unknown'} preview=${previewRawText(rawText.content)}`,
    );
    return {
      name: 'tf',
      ok: false,
      error: 'tf plugin must return valid JSON',
    };
  }

  const parsed = FlowchartSchema.safeParse(json);
  if (!parsed.success) {
    console.error(
      `[Plugin:tf] schema mismatch sessionId=${state.sessionId} provider=${rawText.meta.provider ?? 'unknown'} issues=${formatFlowIssues(parsed.error)} preview=${previewRawText(rawText.content)}`,
    );
    return {
      name: 'tf',
      ok: false,
      error: `Invalid tf output (schema mismatch): ${formatFlowIssues(parsed.error)}`,
    };
  }

  state.flowchart = parsed.data;
  return {
    name: 'tf',
    ok: true,
    data: parsed.data,
  };
}
