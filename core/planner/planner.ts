
import 'server-only';
/**
 * Planner 输出必须始终符合 PlanSchema
 * 任何修改 prompt / schema 都必须同步调整
 */

import { PlanSchema } from './schema';
import { plannerPrompt } from './prompt';
import { callLLM } from '../llm';
import { Message, SessionState } from '../types/type';
import { updateSummaryIfNeeded } from '../llm/updateSummaryIfNeeded';

let context:Message[] = [] 

export async function planner(input: string, state:SessionState ) { 
  
  // 1) 如果 history 太长，先摘要
  await updateSummaryIfNeeded(state, callLLM)
  context = plannerPrompt(input,state);
  // 对 ai 返回的内容进行严格的约束
  console.log(context)
  const rawText = await callLLM(context);
  // ai 返回的内容
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON from LLM');
  }
  const parsed = PlanSchema.safeParse(json)
  // 进行内容的校验
  if (!parsed.success) { 
    throw new Error('Invalid AI output');
  }
  return parsed.data;
  // 返回内容
}
