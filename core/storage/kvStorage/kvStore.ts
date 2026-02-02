import 'server-only';
import { kv } from '@vercel/kv';
import type { SessionState } from '@/core/types/type';

function kvKey(sessionId: string) {
  return `session:${sessionId}`;
}

function userIndexKey(userId: string, scope?: string) {
  return scope ? `user:${userId}:scope:${scope}:sessions` : `user:${userId}:sessions`;
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

export async function addSessionIndex(
  userId: string,
  scope: string,
  sessionId: string,
): Promise<void> {
  await kv.sadd(userIndexKey(userId), sessionId);
  await kv.sadd(userIndexKey(userId, scope), sessionId);
}

export async function listSessionIdsFromKv(
  userId: string,
  scope?: string,
): Promise<string[]> {
  const key = userIndexKey(userId, scope);
  const ids = await kv.smembers<string[]>(key);
  return Array.isArray(ids) ? ids : [];
}
