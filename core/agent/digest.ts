import type { SessionState } from "../types/type";

export function buildObservationDigest(state: SessionState) {
  const obs = state.observation;
  if (!obs || !obs.emits || obs.emits.length === 0) return "";

  const lastEmits = obs.emits
    .slice(-3)
    .map(e => String(e.content ?? "").slice(0, 200)); // 每条最多200字，防token爆

  return JSON.stringify({ lastEmits });
}
