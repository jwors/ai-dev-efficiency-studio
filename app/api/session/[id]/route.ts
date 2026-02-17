import { NextRequest, NextResponse } from 'next/server';
import { loadSession, saveSession } from '@/core/storage/storageMap/map';
import type { SessionState } from '@/core/types/type';

type Params = { id: string };
type RouteContext = { params: Promise<Params> };

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
) {
  const { id: sessionId } = await params;
  const session = await loadSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function PUT(
  req: NextRequest,
  { params }: RouteContext,
) {
  const { id: sessionId } = await params;
  const body = (await req.json()) as SessionState;
  if (!body || body.sessionId !== sessionId) {
    return NextResponse.json(
      { error: 'sessionId mismatch' },
      { status: 400 },
    );
  }

  await saveSession(body);
  return NextResponse.json({ ok: true });
}
