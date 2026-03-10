import 'server-only';

import { PlanSchema } from './schema';
import { plannerPrompt } from '../prompts/plannerPrompt';
import { callLLM, callLLMSummary } from '../llm';
import type { SessionState } from '@/core/types';
import { updateSummaryIfNeeded } from '../llm/updateSummaryIfNeeded';
import { clampMessagesToBudget, estimateMessagesTokens } from '../llm/estimateToken';
import {
  checkTokenBudget,
  refundTokenUsage,
  recordTokenUsage,
  getRemainingBudget,
  checkRequestBudget,
} from '../llm/tokenBudget';

const MAX_PROMPT_TOKENS = 8000;
const RESERVED_OUTPUT = 1000;

export async function planner(input: string, state: SessionState) {
  await checkTokenBudget(state.sessionId);

  await updateSummaryIfNeeded(state, callLLMSummary);

  let context = plannerPrompt(input, state);

  const remainingBudget = await getRemainingBudget(state.sessionId);
  const effectiveBudget = Math.min(MAX_PROMPT_TOKENS - RESERVED_OUTPUT, remainingBudget - 500);
  context = clampMessagesToBudget(context, Math.max(effectiveBudget, 1000));

  checkRequestBudget(context);

  const reservedTokens = estimateMessagesTokens(context);
  await recordTokenUsage(state.sessionId, reservedTokens, context);

  const rawText = await (async () => {
    try {
      return await callLLM(context);
    } catch (error) {
      await refundTokenUsage(state.sessionId, reservedTokens);
      throw error;
    }
  })();

  if (!rawText.content.trim().startsWith('{') && !rawText.content.trim().startsWith('[')) {
    const jsonMatch = rawText.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        goal: input,
        steps: [],
        meta: {
          id: rawText.meta.id ?? crypto.randomUUID(),
          model: rawText.meta.model ?? 'unknown',
          created: rawText.meta.created ?? Date.now(),
        },
        directResponse: rawText.content,
      };
    }

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

  return {
    ...parsed.data,
    id: parsed.data.meta?.id ?? rawText.meta.id ?? crypto.randomUUID(),
    model: parsed.data.meta?.model ?? rawText.meta.model ?? 'unknown',
    created: parsed.data.meta?.created ?? rawText.meta.created ?? Date.now(),
  };
}
