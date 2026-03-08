import type { Message } from '@/core/types';
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
