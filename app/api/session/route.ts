import { NextResponse } from 'next/server';
import { loadSession, saveSession } from '@/core/storage/storageMap/map';
import type { SessionState } from '@/core/types/type';
import { listSessionIdsFromKv } from '@/core/storage/kvStorage/kvStore';

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

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return NextResponse.json(
      { error: 'KV not configured' },
      { status: 501 },
    );
  }

  const ids = await listSessionIdsFromKv(userId, scope);
  const sessions = await Promise.all(ids.map((id) => loadSession(id)));
  const filtered = sessions.filter((s): s is SessionState => Boolean(s));

  return NextResponse.json({
    sessions: filtered,
  });
}
