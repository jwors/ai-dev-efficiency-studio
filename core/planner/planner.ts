
import 'server-only';
/**
 * Planner 输出必须始终符合 PlanSchema
 * 任何修改 prompt / schema 都必须同步调整
 */

import { PlanSchema } from './schema';
import { plannerPrompt } from './prompt';
import { callLLM,callLLmSummary } from '../llm';
import { Message, SessionState } from '../types/type';
import { updateSummaryIfNeeded } from '../llm/updateSummaryIfNeeded';

let context:Message[] = [] 

export async function planner(input: string, state:SessionState ) { 
  // 1) 如果 history 太长，先摘要
  await updateSummaryIfNeeded(state, callLLmSummary)
  
  context = plannerPrompt(input,state);
  // 对 ai 返回的内容进行严格的约束
  const rawText = await callLLM(context);
  let json: unknown;
  try {
    json = JSON.parse(rawText.content);
  } catch {
    throw new Error("Planner must return valid JSON");
  }

  const parsed = PlanSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid planner output (PlanSchema mismatch)");
  }

  // 你如果希望 plan 里也带 meta（保持你现有习惯），可以这样做：
  const planWithMeta = {
    ...parsed.data,
    id: parsed.data.id ?? rawText.meta.id ?? crypto.randomUUID(),
    model: parsed.data.model ?? rawText.meta.model ?? "unknown",
    created: parsed.data.created ?? rawText.meta.created ?? Date.now(),
  };

  // 或者你想更干净：return { plan: parsed.data, meta: raw.meta }
  return planWithMeta;
  // 返回内容
}
