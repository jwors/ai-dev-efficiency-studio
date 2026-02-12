import { NextResponse } from 'next/server';
import { getSession, saveSession } from '@/core/storage/storageMap/map';

type SaveSessionBody = {
  sessionId?: string;
};

async function parseBody(req: Request): Promise<SaveSessionBody> {
  try {
    return (await req.json()) as SaveSessionBody;
  } catch {
    const raw = await req.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw) as SaveSessionBody;
    } catch {
      return {};
    }
  }
}

export async function POST(req: Request) {
  const body = await parseBody(req);
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const state = await getSession(sessionId);
  await saveSession(state);

  return NextResponse.json({ ok: true, sessionId });
}
