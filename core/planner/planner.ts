
import 'server-only';
/**
 * Planner 输出必须始终符合 PlanSchema
 * 任何修改 prompt / schema 都必须同步调整
 */

import { PlanSchema } from './schema';
import { plannerPrompt } from './prompt';
import { callLLM } from '../llm';

export async function planner(input: string) { 
  const prompt = plannerPrompt(input);
  const rawText = await callLLM(prompt);
  let json: unknown;
  console.log(rawText)
  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON from LLM');
  }
  console.log(json)
  const parsed = PlanSchema.safeParse(json)
  if (!parsed.success) { 
    throw new Error('Invalid AI output');
  }

  return parsed.data;
}
