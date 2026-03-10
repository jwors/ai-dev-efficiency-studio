import type { SessionState } from '@/core/types';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const memStore = new Map<string, SessionState>();

// db 是否连接
let dbDisabled = false;

/**
 * 禁用数据库连接。
 * 当数据库不可用时调用，后续操作将降级为内存存储。
 */
function disableDb() {
  dbDisabled = true;
}

/**
 * 解析会话 ID 为用户 ID 和插件作用域。
 * @param sessionId - 会话 ID，格式为 "userId:pluginScope" 或直接是 userId
 * @returns 包含 userId 和 pluginScope 的对象
 */
function parseSessionId(sessionId: string) {
  const parts = sessionId.split(':');
  if (parts.length >= 2) {
    return { userId: parts[0], pluginScope: parts[1] };
  }
  return { userId: sessionId, pluginScope: 'default' };
}

/**
 * 获取或创建会话状态。
 * 如果会话不存在，则创建新的会话状态。
 * @param sessionId - 会话 ID
 * @returns 会话状态对象
 */
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

/**
 * 从存储加载会话状态。
 * 优先从内存缓存读取，其次从数据库读取。
 * @param sessionId - 会话 ID
 * @returns 会话状态对象，不存在时返回 null
 */
export async function loadSession(sessionId: string): Promise<SessionState | null> {
  if (dbDisabled) return memStore.get(sessionId) ?? null;
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
    disableDb()
    return null;
  }
}

/**
 * 保存会话状态到存储。
 * 同时更新内存缓存和数据库（如果可用）。
 * @param state - 会话状态对象
 */
export async function saveSession(state: SessionState) {
  state.updatedAt = Date.now();
  memStore.set(state.sessionId, state);

  if (dbDisabled) return;

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
    disableDb();

  }
}

/**
 * 列出用户的所有会话。
 * 支持按插件作用域过滤。
 * @param userId - 用户 ID
 * @param pluginScope - 插件作用域（可选）
 * @returns 会话状态数组，按更新时间降序排列
 */
export async function listSessions(
  userId: string,
  pluginScope?: string,
): Promise<SessionState[]> {
  if (!userId) return [];

  if (dbDisabled || !prisma?.pluginSession) {
    return Array.from(memStore.values())
      .filter((s) => {
        const { userId: uid, pluginScope: scope } = parseSessionId(s.sessionId);
        return uid === userId && (!pluginScope || scope === pluginScope);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 100);
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

    return rows
      .map((row) => row.data as unknown as SessionState)
      .filter((item): item is SessionState => Boolean(item?.sessionId));
  } catch {
    disableDb();
    return Array.from(memStore.values())
      .filter((s) => {
        const { userId: uid, pluginScope: scope } = parseSessionId(s.sessionId);
        return uid === userId && (!pluginScope || scope === pluginScope);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 100);
  }
}
