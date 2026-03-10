import type { SessionState } from '@/core/types';

/**
 * 构建观察摘要。
 * 从会话状态的观察记录中提取最近的 emit 内容，用于上下文传递。
 * @param state - 会话状态
 * @returns 观察摘要的 JSON 字符串，无观察时返回空字符串
 */
export function buildObservationDigest(state: SessionState) {
  const obs = state.observation;
  if (!obs || !obs.emits || obs.emits.length === 0) return "";

  const lastEmits = obs.emits
    .slice(-3)
    .map(e => String(e.content ?? "").slice(0, 200)); // 每条最多200字，防token爆

  return JSON.stringify({ lastEmits });
}
