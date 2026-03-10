import type { Message } from '@/core/types';

/**
 * 为 Planner 清理历史消息，过滤掉包含敏感信息的内容。
 * @param history - 原始历史消息数组
 * @returns 清理后的消息数组
 */
export function sanitizeHistoryForPlanner(history: Message[]) {
  const blockedPatterns = [
    /127\.0\.0\.1/i,
    /localhost/i,
    /\b0\.0\.0\.0\b/i,
    /http:\/\/+/i,            // 非 https
    /Authorization:\s*Bearer/i,
    /只允许\s*https/i,
    /安全限制/i,
  ];

  return history.filter(m => {
    if (m.role === "system") return true;
    const c = m.content ?? "";
    return !blockedPatterns.some(r => r.test(c));
  });
}
