// Session State Management

import { callLLMSummary } from '../llm';
import { updateSummaryIfNeeded } from '../llm/updateSummaryIfNeeded';
import type { SessionState } from '../types';

/**
 * 更新会话状态。
 * 将用户输入添加到历史记录，并在需要时更新摘要。
 * @param input - 用户输入
 * @param state - 会话状态对象
 */
export async function updateSession(input: string, state: SessionState) {
  state.history.push({
    role: 'user',
    content: input,
  });
  await updateSummaryIfNeeded(state, callLLMSummary);
}