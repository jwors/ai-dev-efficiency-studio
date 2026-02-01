import 'server-only';
import { kv } from '@vercel/kv';
import type { SessionState } from '@/core/types/type';

function kvKey(sessionId: string) {
  return `session:${sessionId}`;
}

export async function loadSessionFromKv(
  sessionId: string,
): Promise<SessionState | null> {
  const raw = await kv.get<SessionState | null>(kvKey(sessionId));
  return raw ?? null;
}

export async function saveSessionToKv(state: SessionState): Promise<void> {
  await kv.set(kvKey(state.sessionId), state);
}
