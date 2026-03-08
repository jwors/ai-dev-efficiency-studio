// Session State Management

import { callLLmSummary } from '../llm';
import { updateSummaryIfNeeded } from '../llm/updateSummaryIfNeeded';
import type { SessionState } from '../types';

export async function updateSession(input: string, state: SessionState) {
  state.history.push({
    role: 'user',
    content: input,
  });
  await updateSummaryIfNeeded(state, callLLmSummary);
}