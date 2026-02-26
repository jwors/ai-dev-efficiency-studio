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

export async function loadSession(sessionId: string): Promise<SessionState | null> {
  console.log(memStore)
  const s = memStore.get(sessionId);
  if (s) return s;

  try {
    const row = await prisma.pluginSession.findUnique({ where: { sessionId } });
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
  } catch {
    return null;
  }
}

export async function saveSession(state: any) {
  state.updatedAt = Date.now();
  memStore.set(state.sessionId, state);

  try {
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
  } catch {
    // db 不可用时只保留 memStore
  }
}


export async function listSessions(
  userId: string,
  pluginScope?: string,
): Promise<SessionState[]> {
  // 1️⃣ 基础判空
  if (!userId) return [];

  if (!prisma || !prisma.pluginSession) {
    console.warn('pluginSession model not available');
    return [];
  }

  try {
    const rows = await prisma.pluginSession.findMany({
      where: {
        userId,
        ...(pluginScope ? { pluginScope } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    if (!rows || rows.length === 0) return [];

    return rows
      .map((row) => {
        if (!row || !row.data) return null;
        return row.data as unknown as SessionState;
      })
      .filter(
        (item): item is SessionState =>
          Boolean(item && item.sessionId)
      );
  } catch (error) {
    return Array.from(memStore.values())
      .filter((s) => {
        const { userId: uid, pluginScope: scope } = parseSessionId(s.sessionId);
        return uid === userId && (!pluginScope || scope === pluginScope);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 100);
  }

}
