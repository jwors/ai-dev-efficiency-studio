
import 'server-only';
/**
 * Planner 输出必须始终符合 PlanSchema
 * 任何修改 prompt / schema 都必须同步调整
 */

import { PlanSchema } from './schema';
import { plannerPrompt } from './prompt';
import { callLLM } from '../llm';
import { Observation } from '../agent/observation';
import { Message } from '../types/context';

let context:Message[] = [] 

export async function planner(input: string, ) { 
  

  context = plannerPrompt(input);
  // 对 ai 返回的内容进行严格的约束

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
  for (let i = 0; i < parsed.data.steps.length; i++) { 
    let item = parsed.data.steps[i]
    if (item.action === 'emit' && item.params?.data?.content) { 
      // 系统回答的
      context.push({
        role: "assistant",
        content: item.params.data.content
      })
      break;
    }
  }
  console.log(context)
  return parsed.data;
  // 返回内容
}
