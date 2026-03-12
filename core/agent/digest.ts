import type { SessionState } from '@/core/types';
import { isRefusalLikeText, sanitizePlannerContextText } from '../planner/sanitize';

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
