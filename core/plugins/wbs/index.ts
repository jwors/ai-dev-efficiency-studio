import 'server-only';
import { callLLM } from '../../llm';
import { clampMessagesToBudget } from '../../llm/estimateToken';
import type { SessionState } from '../../types/type';
import type { PluginResult } from '../types';
import { WbsSchema, type WbsGraph } from './schema';
import { wbsPrompt } from '../../prompts/wbsPrompt';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1200;

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
    return {
      name: 'wbs',
      ok: false,
      error: 'WBS plugin must return valid JSON',
    };
  }

  // zod 验证
  const parsed = WbsSchema.safeParse(json);
  if (!parsed.success) {
    return {
      name: 'wbs',
      ok: false,
      error: 'Invalid WBS output (schema mismatch)',
    };
  }

  state.wbs = parsed.data;
  return {
    name: 'wbs',
    ok: true,
    data: parsed.data,
  };
}
