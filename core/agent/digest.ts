import type { SessionState } from '@/core/types';
import { isRefusalLikeText, sanitizePlannerContextText } from '../planner/sanitize';

/**
 * 构建观察摘要。
 * 从会话状态的观察记录中提取最近的有效内容，用于上下文传递。
 * @param state - 会话状态
 * @returns JSON 格式的摘要字符串，无有效内容时返回空字符串
 */
export function buildObservationDigest(state: SessionState) {
  const obs = state.observation;
  if (!obs || !obs.emits || obs.emits.length === 0) return '';

  const lastEmits = obs.emits
    .filter((item) => !isRefusalLikeText(item.content))
    .slice(-3)
    .map((item) => sanitizePlannerContextText(String(item.content ?? '')).slice(0, 200))
    .filter(Boolean);

  if (lastEmits.length === 0) return '';
  return JSON.stringify({ lastEmits });
}
