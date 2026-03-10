import { NextResponse } from 'next/server';
import { listSessions, saveSession } from '@/core/storage/storageMap/map';
import type { SessionState } from '@/core/types';

type CreateSessionBody = {
  userId: string;
  scope: string;
};

/**
 * 创建新会话的 POST 端点。
 * @param req - 请求对象，包含 userId 和 scope
 * @returns 新创建的会话 ID 和创建时间
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateSessionBody;
    const userId = body?.userId?.trim();
    const scope = body?.scope?.trim();

    if (!userId || !scope) {
      return NextResponse.json(
        { error: 'userId and scope are required' },
        { status: 400 },
      );
    }

    const sessionId = `${userId}:${scope}:${crypto.randomUUID()}`;
    const now = Date.now();
    const state: SessionState = {
      sessionId,
      summary: '',
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    await saveSession(state);

    return NextResponse.json({
      sessionId,
      createdAt: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 列出用户会话的 GET 端点。
 * @param req - 请求对象，URL 参数包含 userId 和可选的 scope
 * @returns 用户的会话列表
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim();
    const scope = searchParams.get('scope')?.trim() ?? undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }

    const sessions = await listSessions(userId, scope);

    return NextResponse.json({
      sessions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
