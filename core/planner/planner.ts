
import 'server-only';
/**
 * Planner 输出必须始终符合 PlanSchema
 * 任何修改 prompt / schema 都必须同步调整
 */

import { PlanSchema } from './schema';
import { plannerPrompt } from './prompt';
import { callLLM } from '../llm';
import { Observation } from '../agent/observation';

export async function planner(input: string,observation?:Observation) { 
  const prompt = plannerPrompt(input, observation);
  // 对 ai 返回的内容进行严格的约束

  const rawText = await callLLM(prompt);
  // ai 返回的内容
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON from LLM');
  }

  const parsed = PlanSchema.safeParse(json)
  // 进行规则的校验
  if (!parsed.success) { 
    throw new Error('Invalid AI output');
  }

  return parsed.data;
  // 返回内容
}
