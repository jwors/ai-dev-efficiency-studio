import type { Message } from '@/core/types';

/**
 * 构建 Planner 消息数组。
 * 组合系统提示、会话摘要、历史消息和当前输入。
 * @param params - 构建参数，包含 system、summary、history 和 input
 * @returns 完整的消息数组
 */
export function buildPlannerMessages(params: {
  system: string;
  summary: string;
  history: Message[];
  input: string;
}): Message[] {
  const msgs: Message[] = [
    { role: "system", content: params.system },
  ];

  if (params.summary.trim()) {
    msgs.push({ role: "system", content: `SESSION_SUMMARY:\n${params.summary}` });
  }

  msgs.push(...params.history);
  msgs.push({ role: "user", content: params.input });

  return msgs;
}
