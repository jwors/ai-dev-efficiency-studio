import { NextResponse } from 'next/server';
import { listSessions, saveSession } from '@/core/storage/storageMap/map';
import type { SessionState } from '@/core/types/type';

type CreateSessionBody = {
  userId: string;
  scope: string;
};

export async function POST(req: Request) {
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
}

export async function GET(req: Request) {
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
}
