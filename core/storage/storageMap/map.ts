import { SessionState } from '@/core/types/type';
import { getPrisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const memStore = new Map<string, SessionState>();
const prisma = getPrisma();

function parseSessionId(sessionId: string) {
  const parts = sessionId.split(':');
  if (parts.length >= 2) {
    return { userId: parts[0], pluginScope: parts[1] };
  }
  return { userId: sessionId, pluginScope: 'default' };
}

export async function getSession(sessionId: string): Promise<SessionState> {
  const loaded = await loadSession(sessionId);
  if (loaded) return loaded;

  const init: SessionState = {
    sessionId,
    summary: '',
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  memStore.set(sessionId, init);
  return init;
}

export async function loadSession(
  sessionId: string,
): Promise<SessionState | null> {
  const s = memStore.get(sessionId);
  if (s) return s;

  const row = await prisma.pluginSession.findUnique({
    where: { sessionId },
  });
  if (!row) return null;

  const data = row.data as unknown as SessionState;
  if (data && data.sessionId === sessionId) {
    memStore.set(sessionId, data);
    return data;
  }

  const fallback: SessionState = {
    sessionId,
    summary: '',
    history: [],
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
  memStore.set(sessionId, fallback);
  return fallback;
}

export async function saveSession(state: any) {
  state.updatedAt = Date.now();
  memStore.set(state.sessionId, state);
  const { userId, pluginScope } = parseSessionId(state.sessionId);

  await prisma.pluginSession.upsert({
    where: { sessionId: state.sessionId },
    create: {
      sessionId: state.sessionId,
      userId,
      pluginScope,
      data: state as unknown as Prisma.InputJsonValue,
    },
    update: {
      userId,
      pluginScope,
      data: state as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
}

export async function listSessions(
  userId: string,
  pluginScope?: string,
): Promise<SessionState[]> {
  const rows = await prisma.pluginSession.findMany({
    where: {
      userId,
      ...(pluginScope ? { pluginScope } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  return rows
    .map((row) => row.data as unknown as SessionState)
    .filter((item): item is SessionState => Boolean(item?.sessionId));
}
