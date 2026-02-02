import { NextResponse } from 'next/server';
import { loadSession, saveSession } from '@/core/storage/storageMap/map';
import type { SessionState } from '@/core/types/type';

type Params = { id: string };

export async function GET(
  _req: Request,
  { params }: { params: Params },
) {
  const sessionId = params.id;
  const session = await loadSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}

export async function PUT(
  req: Request,
  { params }: { params: Params },
) {
  const sessionId = params.id;
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
