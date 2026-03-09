
import 'server-only';
/**
 * Planner 输出必须始终符合 PlanSchema
 * 任何修改 prompt / schema 都必须同步调整
 */

import { PlanSchema } from './schema';
import { plannerPrompt } from '../prompts/plannerPrompt';
import { callLLM,callLLMSummary } from '../llm';
import type { Message, SessionState } from '@/core/types';
import { updateSummaryIfNeeded } from '../llm/updateSummaryIfNeeded';
import { clampMessagesToBudget } from '../llm/estimateToken';

let context: Message[] = [] 
const MAX_PROMPT_TOKENS = 8000;   // 你用的 qwen-plus 自己设个上限即可
const RESERVED_OUTPUT = 1000;     // 给 planner 输出 JSON 留空间


export async function planner(input: string, state:SessionState ) {\  await updateSummaryIfNeeded(state, callLLMSummary)
  // 1) 如果 history 太长，先摘要

  context = plannerPrompt(input, state);
  // 2)
  context = clampMessagesToBudget(context, MAX_PROMPT_TOKENS - RESERVED_OUTPUT);
  // 对 ai 返回的内容进行严格的约束
  const rawText = await callLLM(context);

  // 检查 LLM 是否拒绝了请求（返回非 JSON 内容）
  if (!rawText.content.trim().startsWith('{') && !rawText.content.trim().startsWith('[')) {
    // LLM 可能返回了解释性内容而非 JSON
    // 尝试提取 JSON（如果有的话）
    const jsonMatch = rawText.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // 没有 JSON，说明 LLM 拒绝生成 Plan，直接把内容返回给用户
      return {
        goal: input,
        steps: [],
        meta: {
          id: rawText.meta.id ?? crypto.randomUUID(),
          model: rawText.meta.model ?? "unknown",
          created: rawText.meta.created ?? Date.now(),
        },
        directResponse: rawText.content, // 标记为直接回复
      };
    }
    // 有 JSON，尝试提取
    rawText.content = jsonMatch[0];
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText.content);
  } catch (error) {
    const parseError = error instanceof Error ? error : new Error('Unknown parsing error');
    throw new Error(`Planner JSON parse failed: ${parseError.message}. Raw output: ${rawText.content.slice(0, 500)}`);
  }
  const parsed = PlanSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid planner output (PlanSchema mismatch): ${parsed.error.message}`);
  }

  // 你如果希望 plan 里也带 meta（保持你现有习惯），可以这样做：
  const planWithMeta = {
    ...parsed.data,
    id: parsed.data.meta?.id ?? rawText.meta.id ?? crypto.randomUUID(),
    model: parsed.data.meta?.model ?? rawText.meta.model ?? "unknown",
    created: parsed.data.meta?.created ?? rawText.meta.created ?? Date.now(),
  };
  return planWithMeta;
  // 返回内容
}
